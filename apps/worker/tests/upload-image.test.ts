import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createObjectKeyPlan, DEFAULT_VARIANTS, VARIANT_IDS, parseUploadImageResponse } from 'shared/image-processing'
import { ImageUploadError, uploadImage } from '../src/lib/upload-image'

const uploadId = 'a8a73f4f-8d65-4b3a-a456-426614174000'

function response(id = uploadId) {
  const keys = createObjectKeyPlan(id, 'image/png')
  const base = 'https://images.example.com/'
  return parseUploadImageResponse({
    mediaId: 7, uploadId: id, filename: keys.original.split('/').at(-1),
    mimeType: 'image/png', filesize: 3, width: 2000, height: 1500,
    focalX: 50, focalY: 50, url: base + keys.original,
    thumbnailURL: base + keys.variants.thumbnail,
    variants: Object.fromEntries(VARIANT_IDS.map((variant) => [variant, {
      id: variant, format: 'webp', mimeType: 'image/webp',
      width: DEFAULT_VARIANTS[variant].width, height: DEFAULT_VARIANTS[variant].height,
      filesize: 2, filename: keys.variants[variant].split('/').at(-1), url: base + keys.variants[variant],
    }])),
  })
}

test('sends the original File with URI-encoded Unicode metadata, crop, focal point and cancellation', async (t) => {
  const file = new File(['png'], 'ảnh.png', { type: 'image/png' })
  const crop = { x: 0, y: 0, width: 50, height: 50, unit: '%' as const, rotation: 90 }
  const focalPoint = { x: 25, y: 75 }
  const signal = new AbortController().signal
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    assert.equal(url, '/api/upload')
    assert.equal(init.method, 'POST')
    assert.equal(init.body, file)
    assert.equal(init.credentials, 'same-origin')
    assert.equal(init.signal, signal)
    const headers = new Headers(init.headers)
    assert.equal(headers.get('Content-Type'), 'image/png')
    assert.deepEqual(JSON.parse(decodeURIComponent(headers.get('x-image-metadata')!)), {
      uploadId, filename: 'ảnh.png', mimeType: 'image/png', filesize: 3, crop, focalPoint,
    })
    return Response.json(response())
  })
  assert.deepEqual(await uploadImage(file, { uploadId, crop, focalPoint, signal }), response())
})

test('creates a UUID when none is supplied and allows explicit retry identity', async (t) => {
  const ids: string[] = []
  t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    const metadata = JSON.parse(decodeURIComponent(new Headers(init.headers).get('x-image-metadata')!))
    ids.push(metadata.uploadId)
    return Response.json(response(metadata.uploadId))
  })
  const file = new File(['png'], 'photo.png', { type: 'image/png' })
  const first = await uploadImage(file)
  await uploadImage(file, { uploadId: first.uploadId })
  assert.match(first.uploadId, /^[0-9a-f-]{36}$/)
  assert.equal(ids[0], ids[1])
})

test('exposes validated server errors including retryability and status', async (t) => {
  const error = { uploadId, error: { code: 'PROCESSOR_BUSY', message: 'Try again later.', retryable: true } }
  t.mock.method(globalThis, 'fetch', async () => Response.json(error, { status: 503 }))
  await assert.rejects(uploadImage(new File(['png'], 'photo.png', { type: 'image/png' }), { uploadId }), (cause: unknown) => {
    assert.ok(cause instanceof ImageUploadError)
    assert.equal(cause.status, 503)
    assert.deepEqual(cause.response, error)
    return true
  })
})

test('rejects malformed success, error, non-JSON, and mismatched upload identity', async (t) => {
  const replies = [Response.json({ url: 'bad' }), Response.json({ error: 'bad' }, { status: 500 }),
    new Response('<html>failure</html>', { status: 502 }), Response.json(response('b8a73f4f-8d65-4b3a-a456-426614174000'))]
  t.mock.method(globalThis, 'fetch', async () => replies.shift()!)
  const file = new File(['png'], 'photo.png', { type: 'image/png' })
  for (let index = 0; index < 4; index++) await assert.rejects(uploadImage(file, { uploadId }))
})

test('rejects unsupported or empty files before fetching and propagates network failure', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('offline') })
  await assert.rejects(uploadImage(new File(['gif'], 'photo.gif', { type: 'image/gif' })))
  await assert.rejects(uploadImage(new File([], 'photo.png', { type: 'image/png' })))
  assert.equal(fetchMock.mock.callCount(), 0)
  await assert.rejects(uploadImage(new File(['png'], 'photo.png', { type: 'image/png' })), /offline/)
})
