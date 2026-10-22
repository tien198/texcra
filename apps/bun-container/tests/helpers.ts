import { createWriteStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import sharp from 'sharp'
import { createObjectKeyPlan } from 'shared/image-processing'
import type {
  IImageStorage,
  ImageMimeType,
  ProcessImageMetadata,
  StorageWrite,
} from 'shared/image-processing'
import { webStreamToAsyncIterable } from '../src/processor'

export function fileStream(path: string): ReadableStream<Uint8Array> {
  return Bun.file(path).stream()
}

export async function imageMetadata(
  path: string,
  mimeType: ImageMimeType = 'image/png',
  overrides: Partial<ProcessImageMetadata> = {},
): Promise<ProcessImageMetadata> {
  const uploadId = crypto.randomUUID()
  return {
    uploadId,
    filename: basename(path),
    filesize: (await stat(path)).size,
    mimeType,
    objectKeys: createObjectKeyPlan(uploadId, mimeType),
    ...overrides,
  }
}

export async function fixture(
  path: string,
  width = 640,
  height = 360,
  alpha = false,
) {
  await sharp({
    create: {
      width,
      height,
      channels: alpha ? 4 : 3,
      background: { r: 30, g: 180, b: 60, alpha: alpha ? 0.5 : 1 },
    },
  })
    .png()
    .toFile(path)
  return path
}

/** Disk-backed sink exercises the same stream/length contract as the private bridge. */
export class DiskStorage implements IImageStorage {
  readonly paths = new Map<string, string>()
  readonly lengths = new Map<string, number>()
  active = 0
  maxActive = 0
  failAt?: number
  constructor(private readonly directory: string) {}

  async putObject(object: StorageWrite, signal?: AbortSignal) {
    this.active++
    this.maxActive = Math.max(this.maxActive, this.active)
    let bytes = 0
    try {
      if (this.failAt === this.paths.size)
        throw new Error('Injected storage failure')
      const path = join(this.directory, basename(object.r2Key))
      const count = new Transform({
        transform(chunk, _encoding, callback) {
          bytes += chunk.length
          callback(null, chunk)
        },
      })
      await pipeline(
        Readable.from(webStreamToAsyncIterable(object.body)),
        count,
        createWriteStream(path),
        { signal },
      )
      if (bytes !== object.contentLength)
        throw new Error('Wrong Content-Length')
      this.paths.set(object.r2Key, path)
      this.lengths.set(object.r2Key, bytes)
    } finally {
      this.active--
    }
  }
}
