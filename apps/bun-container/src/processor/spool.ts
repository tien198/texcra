import { createWriteStream } from 'node:fs'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { APP_CONFIG } from '../config'
import { inputTooLargeError, lengthMismatchError } from './errors'

/** Yield chunks from a Web ReadableStream to an AsyncIterable without collecting chunks. */
export async function* webStreamToAsyncIterable(
  stream: ReadableStream<Uint8Array>,
) {
  const reader = stream.getReader()
  let completed = false
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        completed = true
        break
      }
      if (value.byteLength > 0) yield value
    }
  } finally {
    try {
      if (!completed) {
        await reader.cancel()
      }
    } catch {
      // Ignore cancellation failure during cleanup
    } finally {
      reader.releaseLock()
    }
  }
}

/** Counts bytes; rejects over the input cap (UPLOAD_TOO_LARGE) or past `expected` (INVALID_INPUT). */
export function createByteLimiter(
  expected: number,
  maxBytes = APP_CONFIG.processor.maxInputBytes,
) {
  let bytes = 0
  const transform = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.byteLength
      if (bytes > maxBytes) callback(inputTooLargeError(maxBytes))
      else if (bytes > expected) callback(lengthMismatchError())
      else callback(null, chunk)
    },
  })
  return { transform, bytes: () => bytes }
}

/** No chunks are collected: backpressure extends from disk to the request stream. */
export async function spoolToFile(
  body: ReadableStream<Uint8Array>,
  path: string,
  expected: number,
  signal: AbortSignal,
) {
  const limiter = createByteLimiter(expected)
  await pipeline(
    Readable.from(webStreamToAsyncIterable(body)),
    limiter.transform,
    createWriteStream(path, { flags: 'wx' }),
    { signal },
  )
  if (limiter.bytes() !== expected) throw lengthMismatchError()
  return limiter.bytes()
}
