import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import {
  createObjectKeyPlan,
  DEFAULT_VARIANTS,
  ImageProcessingError,
  parseProcessImageResult,
  VARIANT_IDS,
} from 'shared/image-processing'
import type {
  IImageStorage,
  ImageMimeType,
  ProcessImageMetadata,
} from 'shared/image-processing'
import { SharpImageProcessor } from '../src/processor'
import { DiskStorage, fileStream, fixture, imageMetadata } from './helpers'

let directory: string
let temporaryRoot: string
let storage: DiskStorage
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'texcra-test-'))
  temporaryRoot = join(directory, 'jobs')
  await mkdir(temporaryRoot)
  storage = new DiskStorage(directory)
})
afterEach(async () => {
  await rm(directory, { recursive: true, force: true })
})

async function hash(path: string) {
  const digest = createHash('sha256')
  for await (const chunk of createReadStream(path)) digest.update(chunk)
  return digest.digest('hex')
}

describe('native Sharp processing', () => {
  for (const [label, width, height, alpha] of [
    ['landscape', 1000, 600, false],
    ['portrait', 300, 700, false],
    ['square', 500, 500, false],
    ['transparent', 80, 60, true],
    ['tiny', 7, 5, false],
  ] as const) {
    test(`${label}: preserves source and emits seven measured WebP files without enlarging`, async () => {
      const source = await fixture(
        join(directory, 'source.png'),
        width,
        height,
        alpha,
      )
      const metadata = await imageMetadata(source)
      const result = await new SharpImageProcessor(
        storage,
        temporaryRoot,
      ).processImage(fileStream(source), metadata)
      expect(parseProcessImageResult(result, metadata)).toEqual(result)
      expect(await hash(storage.paths.get(metadata.objectKeys.original)!)).toBe(
        await hash(source),
      )
      expect(storage.paths.size).toBe(8)
      expect(storage.maxActive).toBe(1)
      for (const id of VARIANT_IDS) {
        const variant = result.variants[id]
        const info = await sharp(storage.paths.get(variant.r2Key)).metadata()
        expect(info.format).toBe('webp')
        expect(info.width).toBe(variant.width)
        expect(info.height).toBe(variant.height)
        expect(variant.filesize).toBe(storage.lengths.get(variant.r2Key)!)
        expect(variant.width).toBeLessThanOrEqual(
          Math.min(width, DEFAULT_VARIANTS[id].width),
        )
        expect(variant.height).toBeLessThanOrEqual(
          Math.min(height, DEFAULT_VARIANTS[id].height),
        )
        expect(info.exif).toBeUndefined()
        if (alpha) expect(info.hasAlpha).toBe(true)
        if (DEFAULT_VARIANTS[id].fit === 'cover') {
          expect(
            Math.abs(
              variant.width -
                (variant.height * DEFAULT_VARIANTS[id].width) /
                  DEFAULT_VARIANTS[id].height,
            ),
          ).toBeLessThanOrEqual(2)
        }
      }
      expect(await readdir(temporaryRoot)).toEqual([])
    })
  }

  for (const [format, mime] of [
    ['jpeg', 'image/jpeg'],
    ['webp', 'image/webp'],
    ['avif', 'image/avif'],
  ] as const) {
    test(`accepts actual ${format}`, async () => {
      const source = join(directory, `input.${format}`)
      await sharp({
        create: { width: 60, height: 40, channels: 3, background: 'red' },
      })
        .toFormat(format)
        .toFile(source)
      const result = await new SharpImageProcessor(
        storage,
        temporaryRoot,
      ).processImage(fileStream(source), await imageMetadata(source, mime))
      expect(result.original.mimeType).toBe(mime)
    })
  }

  test('EXIF orientation precedes crop; rotation changes variants but preserves source metadata', async () => {
    const source = join(directory, 'exif.jpg')
    await sharp({
      create: { width: 80, height: 40, channels: 3, background: 'red' },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toFile(source)
    const metadata = await imageMetadata(source, 'image/jpeg', {
      crop: { unit: 'px', x: 0, y: 20, width: 40, height: 60, rotation: 90 },
      focalPoint: { x: 25, y: 75 },
    })
    const result = await new SharpImageProcessor(
      storage,
      temporaryRoot,
    ).processImage(fileStream(source), metadata)
    expect([result.original.width, result.original.height]).toEqual([40, 80])
    expect([result.variants.small.width, result.variants.small.height]).toEqual(
      [60, 40],
    )
    expect([result.focalX, result.focalY]).toEqual([25, 75])
    expect(await hash(storage.paths.get(metadata.objectKeys.original)!)).toBe(
      await hash(source),
    )
  })

  test('focal extraction selects the requested edge', async () => {
    const source = join(directory, 'halves.png')
    await sharp(
      Buffer.from(
        '<svg width="200" height="100"><path fill="red" d="M0 0h100v100H0z"/><path fill="blue" d="M100 0h100v100H100z"/></svg>',
      ),
    )
      .png()
      .toFile(source)
    // Right edge (blue)
    const rightMetadata = await imageMetadata(source, 'image/png', {
      focalPoint: { x: 100, y: 50 },
    })
    const rightResult = await new SharpImageProcessor(
      storage,
      temporaryRoot,
    ).processImage(fileStream(source), rightMetadata)
    const rightStats = await sharp(
      storage.paths.get(rightResult.variants.square.r2Key),
    ).stats()
    expect(rightStats.channels[2].mean).toBeGreaterThan(240)
    expect(rightStats.channels[0].mean).toBeLessThan(10)

    // Left edge (red)
    const leftMetadata = await imageMetadata(source, 'image/png', {
      focalPoint: { x: 0, y: 50 },
    })
    const leftResult = await new SharpImageProcessor(
      storage,
      temporaryRoot,
    ).processImage(fileStream(source), leftMetadata)
    const leftStats = await sharp(
      storage.paths.get(leftResult.variants.square.r2Key),
    ).stats()
    expect(leftStats.channels[0].mean).toBeGreaterThan(240)
    expect(leftStats.channels[2].mean).toBeLessThan(10)
  })

  test('rejects MIME spoofing, corrupt bytes, truncation, out-of-bounds crops, and excessive pixels', async () => {
    const valid = await fixture(join(directory, 'valid.png'))
    const corrupt = join(directory, 'corrupt.png')
    await writeFile(corrupt, 'not an image')
    const truncated = join(directory, 'truncated.png')
    await writeFile(truncated, (await readFile(valid)).subarray(0, 70))
    const huge = join(directory, 'huge.png')
    await sharp({
      create: { width: 6400, height: 6400, channels: 3, background: 'white' },
    })
      .png()
      .toFile(huge)
    const processor = new SharpImageProcessor(storage, temporaryRoot)
    for (const [path, mime, extra, code] of [
      [valid, 'image/jpeg', {}, 'INVALID_INPUT'],
      [corrupt, 'image/png', {}, 'INVALID_INPUT'],
      [truncated, 'image/png', {}, 'INVALID_INPUT'],
      [
        valid,
        'image/png',
        { crop: { unit: 'px', x: 630, y: 0, width: 30, height: 30 } },
        'INVALID_INPUT',
      ],
      [huge, 'image/png', {}, 'UPLOAD_TOO_LARGE'],
    ] as const) {
      await expect(
        processor.processImage(
          fileStream(path),
          await imageMetadata(path, mime as ImageMimeType, extra),
        ),
      ).rejects.toMatchObject({ code })
      expect(await readdir(temporaryRoot)).toEqual([])
    }
    expect(storage.paths.size).toBe(0)
  })

  test('rejects streamed upload exceeding 20 MiB input limit', async () => {
    const uploadId = crypto.randomUUID()
    const metadata: ProcessImageMetadata = {
      uploadId,
      filename: 'oversized.bin',
      filesize: 21 * 1024 * 1024,
      mimeType: 'image/png',
      objectKeys: createObjectKeyPlan(uploadId, 'image/png'),
    }
    const chunk = new Uint8Array(1024 * 1024)
    let chunksSent = 0
    const oversizedStream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (chunksSent < 21) {
          chunksSent++
          controller.enqueue(chunk)
        } else {
          controller.close()
        }
      },
    })
    const processor = new SharpImageProcessor(storage, temporaryRoot)
    await expect(
      processor.processImage(oversizedStream, metadata),
    ).rejects.toMatchObject({ code: 'UPLOAD_TOO_LARGE' })
    expect(await readdir(temporaryRoot)).toEqual([])
    expect(storage.paths.size).toBe(0)
  })

  test('rejects unsupported SVG and animated WebP', async () => {
    const svg = join(directory, 'image.svg')
    await writeFile(
      svg,
      '<svg width="10" height="10"><rect width="10" height="10" fill="red"/></svg>',
    )
    const red = await sharp({
      create: { width: 16, height: 16, channels: 3, background: 'red' },
    })
      .raw()
      .toBuffer()
    const blue = await sharp({
      create: { width: 16, height: 16, channels: 3, background: 'blue' },
    })
      .raw()
      .toBuffer()
    const animated = join(directory, 'animated.webp')
    await sharp(Buffer.concat([red, blue]), {
      raw: { width: 16, height: 32, channels: 3, pageHeight: 16 },
    })
      .webp({ loop: 0, delay: [100, 100] })
      .toFile(animated)
    for (const path of [svg, animated]) {
      await expect(
        new SharpImageProcessor(storage, temporaryRoot).processImage(
          fileStream(path),
          await imageMetadata(path, 'image/webp'),
        ),
      ).rejects.toMatchObject({ code: 'UNSUPPORTED_FORMAT' })
    }
  })

  test('enforces streaming length, releases the busy guard after cancellation, and cleans temporary files', async () => {
    const source = await fixture(join(directory, 'valid.png'))
    const metadata = await imageMetadata(source)
    const processor = new SharpImageProcessor(storage, temporaryRoot)
    await expect(
      processor.processImage(fileStream(source), {
        ...metadata,
        filesize: metadata.filesize - 1,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    const controller = new AbortController()
    const waiting = new ReadableStream<Uint8Array>({
      start(stream) {
        stream.enqueue(new Uint8Array([1]))
      },
    })
    const pending = processor.processImage(waiting, metadata, controller.signal)
    await expect(
      processor.processImage(fileStream(source), metadata),
    ).rejects.toMatchObject({ code: 'PROCESSOR_BUSY' })
    controller.abort(
      new ImageProcessingError('PROCESSING_TIMEOUT', 'Test deadline'),
    )
    await expect(pending).rejects.toMatchObject({ code: 'PROCESSING_TIMEOUT' })
    expect(await readdir(temporaryRoot)).toEqual([])
    await expect(
      processor.processImage(fileStream(source), metadata),
    ).resolves.toHaveProperty('variants')
  })

  test('stops subsequent writes after storage failure and cancellation during a write', async () => {
    const source = await fixture(join(directory, 'valid.png'))
    const metadata = await imageMetadata(source)
    storage.failAt = 2
    await expect(
      new SharpImageProcessor(storage, temporaryRoot).processImage(
        fileStream(source),
        metadata,
      ),
    ).rejects.toBeInstanceOf(Error)
    expect(storage.paths.size).toBe(2)
    expect(await readdir(temporaryRoot)).toEqual([])
    const controller = new AbortController()
    let writes = 0
    const abortingStorage: IImageStorage = {
      async putObject(object) {
        writes++
        await object.body.cancel()
        controller.abort(
          new ImageProcessingError('PROCESSING_TIMEOUT', 'Test abort'),
        )
      },
    }
    await expect(
      new SharpImageProcessor(abortingStorage, temporaryRoot).processImage(
        fileStream(source),
        metadata,
        controller.signal,
      ),
    ).rejects.toMatchObject({ code: 'PROCESSING_TIMEOUT' })
    expect(writes).toBe(1)
    expect(await readdir(temporaryRoot)).toEqual([])
  })
})
