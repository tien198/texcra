import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable, Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { Metadata } from 'sharp'
import { ImageProcessingError } from 'shared/image-processing'
import { APP_CONFIG } from '../src/config'
import {
  formatMegapixels,
  formatMiB,
  formatSeconds,
  inputTooLargeError,
  pixelLimitError,
  processingTimeoutError,
  toProcessingError,
} from '../src/processor/errors'
import {
  assertWithinPixelLimit,
  detectMime,
  orientedSize,
} from '../src/processor/inspect'
import { createJobSignal } from '../src/processor/job-signal'
import { createByteLimiter, spoolToFile } from '../src/processor/spool'
import { normalizeRotation } from '../src/processor/transform'

const MIB = 1024 * 1024
const meta = (value: Partial<Metadata>) => value as Metadata
const streamOf = (bytes: Uint8Array<ArrayBuffer>) =>
  new Blob([bytes]).stream()

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    return error instanceof ImageProcessingError ? error.code : String(error)
  }
  return undefined
}

describe('error message formatting', () => {
  test('formats limits compactly', () => {
    expect(formatMiB(20 * MIB)).toBe('20 MiB')
    expect(formatMiB(2.5 * MIB)).toBe('2.5 MiB')
    expect(formatMegapixels(40_000_000)).toBe('40 megapixel')
    expect(formatSeconds(120_000)).toBe('120 seconds')
    expect(formatSeconds(1500)).toBe('1.5 seconds')
  })

  test('current config produces the original wording', () => {
    expect(inputTooLargeError().message).toBe(
      'Image exceeds the 20 MiB input limit',
    )
    expect(pixelLimitError().message).toBe(
      'Image exceeds the 40 megapixel limit',
    )
    expect(
      processingTimeoutError(APP_CONFIG.processor.processingMs).message,
    ).toBe('Image processing exceeded 120 seconds')
  })

  test('messages follow custom limits', () => {
    expect(inputTooLargeError(5 * MIB).message).toContain('5 MiB')
    expect(pixelLimitError(12_500_000).message).toContain('12.5 megapixel')
  })

  test('sharp pixel limit matches the limit quoted to users', () => {
    expect(APP_CONFIG.sharp.inputOptions.limitInputPixels).toBe(
      APP_CONFIG.processor.maxInputPixels,
    )
  })
})

describe('toProcessingError', () => {
  const live = new AbortController().signal

  test('abort reason wins over the original error', () => {
    const controller = new AbortController()
    const reason = new ImageProcessingError('PROCESSING_TIMEOUT', 'late')
    controller.abort(reason)
    expect(toProcessingError(new Error('boom'), controller.signal)).toBe(reason)
  })

  test('falls back to AbortError when the abort carries no reason', () => {
    const signal = { aborted: true, reason: undefined } as AbortSignal
    const result = toProcessingError(new Error('boom'), signal)
    expect(result).toBeInstanceOf(DOMException)
    expect((result as DOMException).name).toBe('AbortError')
  })

  test('passes through typed errors', () => {
    const error = new ImageProcessingError('INVALID_INPUT', 'bad')
    expect(toProcessingError(error, live)).toBe(error)
  })

  test('maps sharp pixel-limit failures to UPLOAD_TOO_LARGE', () => {
    const result = toProcessingError(
      new Error('Input image exceeds pixel limit'),
      live,
    ) as ImageProcessingError
    expect(result.code).toBe('UPLOAD_TOO_LARGE')
    expect(result.message).toBe(pixelLimitError().message)
  })

  test('maps unknown failures to INVALID_INPUT', () => {
    const result = toProcessingError(
      new Error('corrupt'),
      live,
    ) as ImageProcessingError
    expect(result.code).toBe('INVALID_INPUT')
  })
})

describe('createJobSignal', () => {
  test('aborts immediately with the parent reason when already aborted', () => {
    const parent = new AbortController()
    parent.abort('gone')
    const job = createJobSignal(parent.signal, 60_000)
    expect(job.signal.aborted).toBe(true)
    expect(job.signal.reason).toBe('gone')
    job.dispose()
  })

  test('propagates a later parent abort', () => {
    const parent = new AbortController()
    const job = createJobSignal(parent.signal, 60_000)
    expect(job.signal.aborted).toBe(false)
    parent.abort('later')
    expect(job.signal.reason).toBe('later')
    job.dispose()
  })

  test('deadline aborts with PROCESSING_TIMEOUT', async () => {
    const job = createJobSignal(undefined, 10)
    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(job.signal.aborted).toBe(true)
    const reason = job.signal.reason as ImageProcessingError
    expect(reason.code).toBe('PROCESSING_TIMEOUT')
    expect(reason.message).toBe('Image processing exceeded 0.01 seconds')
    job.dispose()
  })

  test('dispose clears the deadline and detaches from the parent', async () => {
    const parent = new AbortController()
    const job = createJobSignal(parent.signal, 10)
    job.dispose()
    parent.abort('ignored')
    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(job.signal.aborted).toBe(false)
  })
})

describe('normalizeRotation', () => {
  test('normalizes into [0, 360)', () => {
    expect(normalizeRotation()).toBe(0)
    expect(normalizeRotation(-90)).toBe(270)
    expect(normalizeRotation(450)).toBe(90)
    expect(normalizeRotation(360)).toBe(0)
  })
})

describe('inspect helpers', () => {
  test('detectMime maps supported formats', () => {
    expect(detectMime(meta({ format: 'jpeg' }))).toBe('image/jpeg')
    expect(detectMime(meta({ format: 'png' }))).toBe('image/png')
    expect(detectMime(meta({ format: 'webp' }))).toBe('image/webp')
    expect(detectMime(meta({ format: 'heif', compression: 'av1' }))).toBe(
      'image/avif',
    )
  })

  test('detectMime rejects HEIC and SVG as UNSUPPORTED_FORMAT', () => {
    for (const value of [
      meta({ format: 'heif', compression: 'hevc' }),
      meta({ format: 'svg' }),
    ]) {
      expect(() => detectMime(value)).toThrow(ImageProcessingError)
      try {
        detectMime(value)
      } catch (error) {
        expect((error as ImageProcessingError).code).toBe('UNSUPPORTED_FORMAT')
      }
    }
  })

  test('orientedSize swaps axes only for orientations 5-8', () => {
    expect(orientedSize(40, 20)).toEqual({ width: 40, height: 20 })
    expect(orientedSize(40, 20, 4)).toEqual({ width: 40, height: 20 })
    expect(orientedSize(40, 20, 5)).toEqual({ width: 20, height: 40 })
    expect(orientedSize(40, 20, 8)).toEqual({ width: 20, height: 40 })
  })

  test('assertWithinPixelLimit enforces limit and missing dimensions', () => {
    expect(assertWithinPixelLimit(meta({ width: 10, height: 10 }), 100)).toEqual(
      { width: 10, height: 10 },
    )
    expect(() =>
      assertWithinPixelLimit(meta({ width: 11, height: 10 }), 100),
    ).toThrow('Image exceeds the 0 megapixel limit')
    expect(() => assertWithinPixelLimit(meta({ width: 10 }))).toThrow(
      ImageProcessingError,
    )
  })
})

describe('spooling', () => {
  let directory: string
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'texcra-units-'))
  })
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true })
  })

  const signal = () => new AbortController().signal

  test('writes the exact body and returns its length', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5])
    const path = join(directory, 'ok')
    expect(await spoolToFile(streamOf(bytes), path, 5, signal())).toBe(5)
    expect(new Uint8Array(await readFile(path))).toEqual(bytes)
  })

  test('rejects bodies shorter or longer than declared', async () => {
    const bytes = new Uint8Array(5)
    expect(
      await codeOf(spoolToFile(streamOf(bytes), join(directory, 'a'), 6, signal())),
    ).toBe('INVALID_INPUT')
    expect(
      await codeOf(spoolToFile(streamOf(bytes), join(directory, 'b'), 4, signal())),
    ).toBe('INVALID_INPUT')
  })

  test('byte limiter rejects input above its cap as UPLOAD_TOO_LARGE', async () => {
    const limiter = createByteLimiter(100, 10)
    const sink = new Writable({ write: (_chunk, _enc, done) => done() })
    expect(
      await codeOf(
        pipeline(Readable.from([Buffer.alloc(11)]), limiter.transform, sink),
      ),
    ).toBe('UPLOAD_TOO_LARGE')
  })
})
