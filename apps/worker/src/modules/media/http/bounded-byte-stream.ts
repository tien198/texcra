import {
  ImageProcessingError,
  IMAGE_PROCESSING_LIMITS,
} from 'shared/image-processing'

export class BoundedByteStream {
  private static readonly instances = new Map<number, BoundedByteStream>()

  public constructor(
    private readonly maxInputBytes: number = IMAGE_PROCESSING_LIMITS.maxInputBytes,
  ) {}

  public static getInstance(
    maxInputBytes: number = IMAGE_PROCESSING_LIMITS.maxInputBytes,
  ): BoundedByteStream {
    let instance = BoundedByteStream.instances.get(maxInputBytes)
    if (!instance) {
      instance = new BoundedByteStream(maxInputBytes)
      BoundedByteStream.instances.set(maxInputBytes, instance)
    }
    return instance
  }

  /** Pull only when the downstream consumer is ready; never accumulate image chunks. */
  public wrap(
    source: ReadableStream<Uint8Array>,
    expectedBytes: number,
  ): ReadableStream<Uint8Array> {
    const maxInputBytes = this.maxInputBytes
    const reader = source.getReader()
    let bytes = 0
    return new ReadableStream<Uint8Array>(
      {
        async pull(controller) {
          try {
            const chunk = await reader.read()
            if (chunk.done) {
              if (bytes !== expectedBytes) {
                throw new ImageProcessingError(
                  'INVALID_INPUT',
                  'The image byte count does not match its metadata.',
                )
              }
              controller.close()
              reader.releaseLock()
              return
            }
            bytes += chunk.value.byteLength
            if (bytes > maxInputBytes || bytes > expectedBytes) {
              throw new ImageProcessingError(
                'UPLOAD_TOO_LARGE',
                'The image exceeds the declared upload size.',
              )
            }
            controller.enqueue(chunk.value)
          } catch (error) {
            await reader.cancel(error).catch(() => undefined)
            controller.error(error)
          }
        },
        async cancel(reason) {
          await reader.cancel(reason)
        },
      },
      { highWaterMark: 0 },
    )
  }
}
