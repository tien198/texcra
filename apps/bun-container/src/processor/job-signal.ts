import { processingTimeoutError } from './errors'

export interface JobSignal {
  readonly signal: AbortSignal
  /** Clear the deadline and detach from the parent signal. */
  dispose(): void
}

/** Link the caller's signal to a job-scoped controller with a processing deadline. */
export function createJobSignal(
  parent: AbortSignal | undefined,
  timeoutMs: number,
): JobSignal {
  const controller = new AbortController()
  const onAbort = () => controller.abort(parent?.reason)
  parent?.addEventListener('abort', onAbort, { once: true })
  if (parent?.aborted) onAbort()
  const deadline = setTimeout(
    () => controller.abort(processingTimeoutError(timeoutMs)),
    timeoutMs,
  )
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(deadline)
      parent?.removeEventListener('abort', onAbort)
    },
  }
}
