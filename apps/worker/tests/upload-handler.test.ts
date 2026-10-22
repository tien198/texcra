import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createObjectKeyPlan,
  decodeImageMetadata,
  encodeImageMetadata,
  ImageProcessingError,
  IMAGE_PROCESSING_LIMITS,
  parseProcessImageMetadata,
  parseUploadErrorResponse,
} from 'shared/image-processing'
import { handleImageUpload, processorSlot } from '../src/server/upload-handler'
import { boundedImageStream, readImageJson } from '../src/server/image-http'
import { getCloudflareBindings } from '../src/server/runtime-bindings'
import type { ImageUploadBindings } from '../src/server/upload-handler'

const metadata = {
  uploadId: 'a8a73f4f-8d65-4b3a-a456-426614174000',
  filename: 'ảnh.png',
  filesize: 3,
  mimeType: 'image/png' as const,
}
function request(
  headers: Record<string, string> = {},
  value: unknown = metadata,
) {
  return new Request('https://texcra.example/api/upload', {
    method: 'POST',
    body: new Uint8Array([1, 2, 3]),
    headers: {
      'Content-Type': 'image/png',
      'x-image-metadata': encodeImageMetadata(value),
      ...headers,
    },
  })
}
function bindings(
  fetch: ReturnType<
    ImageUploadBindings['IMAGE_PROCESSOR']['getByName']
  >['fetch'],
): ImageUploadBindings {
  return {
    MEDIA_PUBLIC_BASE_URL: 'https://images.example',
    IMAGE_PROCESSOR: { getByName: () => ({ fetch }) },
  }
}

test('streams raw bytes to a stable slot and forwards only validated metadata', async () => {
  let slot: string | undefined
  const env = bindings(async (input, init) => {
    assert.equal(input, 'http://image-processor/process')
    assert.equal(init?.method, 'POST')
    const headers = new Headers(init.headers)
    assert.equal(headers.get('Cookie'), null)
    assert.equal(headers.get('Authorization'), null)
    const parsed = parseProcessImageMetadata(
      decodeImageMetadata(headers.get('x-image-metadata')),
    )
    assert.deepEqual(parsed, {
      ...metadata,
      objectKeys: createObjectKeyPlan(metadata.uploadId, metadata.mimeType),
    })
    assert.ok(init.body instanceof ReadableStream)
    assert.deepEqual(
      [...new Uint8Array(await new Response(init.body).arrayBuffer())],
      [1, 2, 3],
    )
    return Response.json({ accepted: true })
  })
  const stub = env.IMAGE_PROCESSOR.getByName('test')
  env.IMAGE_PROCESSOR.getByName = (name) => {
    slot = name
    return stub
  }
  assert.equal(
    (
      await handleImageUpload(
        request({ Cookie: 'session=private', Authorization: 'Bearer private' }),
        env,
      )
    ).status,
    200,
  )
  assert.equal(slot, processorSlot(metadata.uploadId))
  assert.match(slot, /^image-processor-[0-4]$/)
})

test('rejects malformed transport and cross-origin requests before dispatch', async () => {
  let calls = 0
  const env = bindings(async () => {
    calls++
    return new Response()
  })
  const cases: Array<[Request, number]> = [
    [request({ Origin: 'https://other.example' }), 403],
    [request({ 'Sec-Fetch-Site': 'cross-site' }), 403],
    [request({ 'Content-Type': 'image/jpeg' }), 415],
    [request({ 'Content-Length': '4' }), 400],
    [
      request(
        {},
        { ...metadata, filesize: IMAGE_PROCESSING_LIMITS.maxInputBytes + 1 },
      ),
      413,
    ],
    [request({ 'x-image-metadata': '%' }), 400],
    [
      request(
        {},
        {
          ...metadata,
          crop: { x: NaN, y: 0, width: 1, height: 1, unit: 'px' },
        },
      ),
      400,
    ],
  ]
  for (const [input, status] of cases)
    assert.equal((await handleImageUpload(input, env)).status, status)
  assert.equal(calls, 0)
})

test('passes through authentication while requiring deployment bindings and the public R2 origin', async () => {
  const env = bindings(async () => new Response(null, { status: 204 }))
  assert.equal((await handleImageUpload(request(), env)).status, 204)
  assert.equal((await handleImageUpload(request())).status, 503)
  assert.equal(
    (await handleImageUpload(request(), { ...env, MEDIA_PUBLIC_BASE_URL: '' }))
      .status,
    500,
  )
  assert.equal(getCloudflareBindings(request()), undefined)
})

test('returns stable retryable errors when the internal processor fails', async () => {
  const result = await handleImageUpload(
    request(),
    bindings(async () => {
      throw new Error('private runtime details')
    }),
  )
  assert.equal(result.status, 500)
  const payload = parseUploadErrorResponse(await result.json())
  assert.equal(payload.uploadId, metadata.uploadId)
  assert.equal(payload.error.code, 'INTERNAL_ERROR')
  assert.equal(payload.error.retryable, true)
  assert.doesNotMatch(payload.error.message, /private/)
})

test('bounded stream does not pull until consumed and cancels on overflow', async () => {
  let pulls = 0
  let canceled = false
  const source = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        pulls++
        controller.enqueue(new Uint8Array([1, 2, 3, 4]))
      },
      cancel() {
        canceled = true
      },
    },
    { highWaterMark: 0 },
  )
  const stream = boundedImageStream(source, 3)
  await Promise.resolve()
  assert.equal(pulls, 0)
  await assert.rejects(
    new Response(stream).arrayBuffer(),
    (error) =>
      error instanceof ImageProcessingError &&
      error.code === 'UPLOAD_TOO_LARGE',
  )
  assert.equal(pulls, 1)
  assert.equal(canceled, true)
})

test('bounded stream rejects truncation and forwards cancellation', async () => {
  const short = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1]))
      controller.close()
    },
  })
  await assert.rejects(
    new Response(boundedImageStream(short, 3)).arrayBuffer(),
    (error) =>
      error instanceof ImageProcessingError && error.code === 'INVALID_INPUT',
  )
  let reason: unknown
  const source = new ReadableStream<Uint8Array>({
    cancel(value) {
      reason = value
    },
  })
  await boundedImageStream(source, 3).cancel('client disconnected')
  assert.equal(reason, 'client disconnected')
})

test('buffers only bounded JSON control responses', async () => {
  assert.deepEqual(await readImageJson(Response.json({ value: 'ảnh' })), {
    value: 'ảnh',
  })
  await assert.rejects(readImageJson(new Response('123456'), 5), /too large/)
  await assert.rejects(readImageJson(new Response('{broken}')))
  await assert.rejects(readImageJson(new Response(new Uint8Array([0xff]))))
})
