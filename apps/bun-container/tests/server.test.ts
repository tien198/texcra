import { afterEach, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  encodeImageMetadata,
  IMAGE_METADATA_HEADER,
  ImageProcessingError,
  parseProcessImageResult,
  parseUploadErrorResponse,
} from 'shared/image-processing'
import type {
  IImageProcessor,
  ProcessImageMetadata,
  ProcessImageResult,
  StorageWrite,
} from 'shared/image-processing'
import { startImageServer } from '../src/server'
import { SharpImageProcessor } from '../src/processor'
import { R2BridgeStorage } from '../src/storage'
import { DiskStorage, fixture, imageMetadata } from './helpers'

const servers: ReturnType<typeof startImageServer>[] = []
const directories: string[] = []
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.stop(true)))
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  )
})

function start(processor?: IImageProcessor, processingMs?: number) {
  const server = startImageServer({
    port: 0,
    hostname: '127.0.0.1',
    processor,
    processingMs,
  })
  servers.push(server)
  return server
}

async function input() {
  const directory = await mkdtemp(join(tmpdir(), 'texcra-http-'))
  directories.push(directory)
  const source = await fixture(join(directory, 'input.png'), 80, 60)
  return { directory, source, metadata: await imageMetadata(source) }
}

function headers(metadata: ProcessImageMetadata) {
  return {
    [IMAGE_METADATA_HEADER]: encodeImageMetadata(metadata),
    'content-type': metadata.mimeType,
  }
}

test('real Bun HTTP server runs native Sharp and resolves the shared package', async () => {
  const { directory, source, metadata } = await input()
  const storage = new DiskStorage(directory)
  const server = start(new SharpImageProcessor(storage))
  expect(await (await fetch(new URL('/healthz', server.url))).json()).toEqual({
    ok: true,
    busy: false,
    uploadId: null,
  })
  const response = await fetch(new URL('/process', server.url), {
    method: 'POST',
    headers: headers(metadata),
    body: Bun.file(source),
  })
  expect(response.status).toBe(200)
  const result = parseProcessImageResult(await response.json(), metadata)
  expect(result.original.width).toBe(80)
  expect(storage.paths.size).toBe(8)
  expect((await fetch(new URL('/missing', server.url))).status).toBe(404)
})

test('malformed, oversized, and mismatched transport metadata never reach processing', async () => {
  const { source, metadata } = await input()
  let calls = 0
  const server = start({
    async processImage() {
      calls++
      throw new Error('Should not process')
    },
  })
  for (const value of [
    undefined,
    '%broken',
    'x'.repeat(4097),
    encodeURIComponent(JSON.stringify({ ...metadata, objectKeys: {} })),
  ]) {
    const response = await fetch(new URL('/process', server.url), {
      method: 'POST',
      headers: {
        'content-type': 'image/png',
        ...(value ? { [IMAGE_METADATA_HEADER]: value } : {}),
      },
      body: Bun.file(source),
    })
    expect(response.status).toBe(400)
    expect(parseUploadErrorResponse(await response.json()).error.code).toBe(
      'INVALID_INPUT',
    )
  }
  const mismatch = await fetch(new URL('/process', server.url), {
    method: 'POST',
    headers: { ...headers(metadata), 'content-type': 'image/jpeg' },
    body: Bun.file(source),
  })
  const mismatchStream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(metadata.filesize + 10))
      controller.close()
    },
  })
  const mismatchLength = await fetch(new URL('/process', server.url), {
    method: 'POST',
    headers: {
      ...headers(metadata),
      'content-length': String(metadata.filesize + 10),
    },
    body: mismatchStream,
  })
  expect(mismatchLength.status).toBe(400)
  expect(parseUploadErrorResponse(await mismatchLength.json()).error.code).toBe(
    'INVALID_INPUT',
  )
  expect(calls).toBe(0)
})

test('busy requests are rejected and health exposes the active upload until cleanup completes', async () => {
  const { source, metadata } = await input()
  let started!: () => void
  const entered = new Promise<void>((resolve) => {
    started = resolve
  })
  let finish!: () => void
  const gate = new Promise<void>((resolve) => {
    finish = resolve
  })
  const server = start({
    async processImage() {
      started()
      await gate
      throw new ImageProcessingError(
        'INVALID_INPUT',
        'Intentional test failure',
      )
    },
  })
  const first = fetch(new URL('/process', server.url), {
    method: 'POST',
    headers: headers(metadata),
    body: Bun.file(source),
  })
  await entered
  const health = await (await fetch(new URL('/healthz', server.url))).json()
  expect(health).toEqual({ ok: true, busy: true, uploadId: metadata.uploadId })
  const second = await fetch(new URL('/process', server.url), {
    method: 'POST',
    headers: headers(metadata),
    body: Bun.file(source),
  })
  expect(second.status).toBe(503)
  expect(parseUploadErrorResponse(await second.json()).error.code).toBe(
    'PROCESSOR_BUSY',
  )
  finish()
  expect((await first).status).toBe(400)
  expect(
    (await (await fetch(new URL('/healthz', server.url))).json()).busy,
  ).toBe(false)
})

test('processing deadline aborts the job and permits the next request after settlement', async () => {
  const { source, metadata } = await input()
  let aborted = 0
  const processor: IImageProcessor = {
    processImage(_body, _metadata, signal) {
      return new Promise<ProcessImageResult>((_resolve, reject) => {
        signal!.addEventListener(
          'abort',
          () => {
            aborted++
            reject(signal!.reason)
          },
          { once: true },
        )
      })
    },
  }
  const server = start(processor, 20)
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(new URL('/process', server.url), {
      method: 'POST',
      headers: headers(metadata),
      body: Bun.file(source),
    })
    expect(response.status).toBe(504)
    expect(parseUploadErrorResponse(await response.json()).error.code).toBe(
      'PROCESSING_TIMEOUT',
    )
  }
  expect(aborted).toBe(2)
})

test('disconnecting the Bun client cancels active work', async () => {
  const { source, metadata } = await input()
  let started!: () => void
  const entered = new Promise<void>((resolve) => {
    started = resolve
  })
  let aborted!: () => void
  const cancelled = new Promise<void>((resolve) => {
    aborted = resolve
  })
  const server = start({
    processImage(_body, _metadata, signal) {
      started()
      return new Promise<ProcessImageResult>((_resolve, reject) => {
        signal!.addEventListener(
          'abort',
          () => {
            aborted()
            reject(signal!.reason)
          },
          { once: true },
        )
      })
    },
  })
  const controller = new AbortController()
  const pending = fetch(new URL('/process', server.url), {
    method: 'POST',
    headers: headers(metadata),
    body: Bun.file(source),
    signal: controller.signal,
  })
  // Attach the rejection handler before aborting to avoid an unhandled rejection.
  const rejected = pending.catch((error) => error)
  await entered
  controller.abort()
  await rejected
  await cancelled
})

test('bridge client streams exact bytes and length over Bun HTTP', async () => {
  const { directory, source, metadata } = await input()
  const storage = new DiskStorage(directory)
  let received = false
  const bridge = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    async fetch(request) {
      expect(request.method).toBe('PUT')
      expect(request.headers.get('content-type')).toBe('image/png')
      expect(request.headers.get('content-length')).toBe(
        String(metadata.filesize),
      )
      expect(request.headers.get('cache-control')).toContain('immutable')
      const object: StorageWrite = {
        r2Key: new URL(request.url).pathname.slice(1),
        body: request.body!,
        contentType: 'image/png',
        contentLength: metadata.filesize,
      }
      await storage.putObject(object)
      received = true
      return new Response(null, { status: 204 })
    },
  })
  servers.push(bridge)
  const fetcher = (url: string | URL | Request, init?: RequestInit) =>
    fetch(new URL(new URL(String(url)).pathname, bridge.url), init)
  await new R2BridgeStorage(fetcher).putObject({
    r2Key: metadata.objectKeys.original,
    contentType: 'image/png',
    contentLength: metadata.filesize,
    body: Bun.file(source).stream(),
  })
  expect(received).toBe(true)
  expect(storage.lengths.get(metadata.objectKeys.original)).toBe(
    metadata.filesize,
  )
})

test('bridge failure and forbidden paths produce typed errors', async () => {
  const { source, metadata } = await input()
  const fetcher = async () => new Response(null, { status: 503 })
  const bridge = new R2BridgeStorage(fetcher)
  await expect(
    bridge.putObject({
      r2Key: metadata.objectKeys.original,
      contentType: 'image/png',
      contentLength: metadata.filesize,
      body: Bun.file(source).stream(),
    }),
  ).rejects.toMatchObject({ code: 'STORAGE_FAILED' })
  await expect(
    bridge.putObject({
      r2Key: '../escape',
      contentType: 'image/png',
      contentLength: metadata.filesize,
      body: Bun.file(source).stream(),
    }),
  ).rejects.toMatchObject({ code: 'STORAGE_FAILED' })
})
