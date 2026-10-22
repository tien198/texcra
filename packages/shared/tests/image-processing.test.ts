import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_VARIANTS,
  IMAGE_METADATA_HEADER,
  IMAGE_PROCESSING_LIMITS,
  ImageProcessingError,
  VARIANT_IDS,
  createObjectKeyPlan,
  decodeImageMetadata,
  encodeImageMetadata,
  parseProcessImageMetadata,
  parseProcessImageResult,
  parseUploadErrorResponse,
  parseUploadImageResponse,
  parseUploadMetadata,
} from '../src/image-processing/index'
import type {
  ImageMimeType,
  ProcessedVariant,
  ProcessImageMetadata,
  ProcessImageResult,
  PublicVariants,
  UploadErrorCode,
  UploadImageResponse,
  UploadMetadata,
  VariantId,
} from '../src/image-processing/index'

const UPLOAD_ID = '8e40b65b-d90f-4e2b-b732-577c384da9fe'
const OTHER_ID = '47c48426-5b53-41be-8afb-c7dc66d75ced'
const PUBLIC_BASE = 'https://media.example.com/'

function upload(overrides: Partial<UploadMetadata> = {}): UploadMetadata {
  return {
    uploadId: UPLOAD_ID,
    filename: 'ảnh mùa hè.png',
    mimeType: 'image/png',
    filesize: 1234,
    ...overrides,
  }
}

function processing(
  overrides: Partial<UploadMetadata> = {},
): ProcessImageMetadata {
  const metadata = upload(overrides)
  return {
    ...metadata,
    objectKeys: createObjectKeyPlan(metadata.uploadId, metadata.mimeType),
  }
}

function filename(key: string): string {
  return key.slice(key.lastIndexOf('/') + 1)
}

function variant<TVariant extends VariantId>(
  metadata: ProcessImageMetadata,
  id: TVariant,
): ProcessedVariant<TVariant> {
  const key = metadata.objectKeys.variants[id]
  return {
    r2Key: key,
    filename: filename(key),
    mimeType: 'image/webp',
    filesize: 128,
    width: DEFAULT_VARIANTS[id].width,
    height: DEFAULT_VARIANTS[id].height,
    id,
    format: 'webp',
  }
}

function result(metadata = processing()): ProcessImageResult {
  return {
    uploadId: metadata.uploadId,
    original: {
      r2Key: metadata.objectKeys.original,
      filename: filename(metadata.objectKeys.original),
      mimeType: metadata.mimeType,
      filesize: metadata.filesize,
      width: 2400,
      height: 1600,
    },
    focalX: metadata.focalPoint?.x ?? 50,
    focalY: metadata.focalPoint?.y ?? 50,
    variants: {
      thumbnail: variant(metadata, 'thumbnail'),
      square: variant(metadata, 'square'),
      small: variant(metadata, 'small'),
      medium: variant(metadata, 'medium'),
      large: variant(metadata, 'large'),
      xlarge: variant(metadata, 'xlarge'),
      og: variant(metadata, 'og'),
    },
  }
}

function publicVariant<TVariant extends VariantId>(
  image: ProcessedVariant<TVariant>,
): Omit<ProcessedVariant<TVariant>, 'r2Key'> & { url: string } {
  const { r2Key, ...fields } = image
  return { ...fields, url: `${PUBLIC_BASE}${r2Key}` }
}

function response(): UploadImageResponse {
  const processed = result()
  const { r2Key, ...original } = processed.original
  const variants: PublicVariants = {
    thumbnail: publicVariant(processed.variants.thumbnail),
    square: publicVariant(processed.variants.square),
    small: publicVariant(processed.variants.small),
    medium: publicVariant(processed.variants.medium),
    large: publicVariant(processed.variants.large),
    xlarge: publicVariant(processed.variants.xlarge),
    og: publicVariant(processed.variants.og),
  }
  return {
    ...original,
    url: `${PUBLIC_BASE}${r2Key}`,
    mediaId: 5,
    uploadId: processed.uploadId,
    thumbnailURL: variants.thumbnail.url,
    focalX: processed.focalX,
    focalY: processed.focalY,
    variants,
  }
}

function rejects(
  operation: () => unknown,
  code: UploadErrorCode = 'INVALID_INPUT',
): void {
  assert.throws(operation, (error: unknown) => {
    assert.ok(error instanceof ImageProcessingError)
    assert.equal(error.code, code)
    return true
  })
}

describe('upload metadata boundary', () => {
  it('accepts Unicode filenames, crops, focal edge values, and all formats', () => {
    for (const mimeType of [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
    ] as const) {
      const value = upload({
        mimeType,
        filesize: IMAGE_PROCESSING_LIMITS.maxInputBytes,
        crop: {
          x: 10,
          y: 20,
          width: 90,
          height: 80,
          unit: '%',
          rotation: -90.5,
        },
        focalPoint: { x: 0, y: 100 },
      })
      assert.deepEqual(parseUploadMetadata(value), value)
    }
    const pixels = upload({
      crop: { x: 0.5, y: 10, width: 200, height: 50.5, unit: 'px' },
    })
    assert.deepEqual(parseUploadMetadata(pixels), pixels)
  })

  it('rejects server-owned or otherwise unknown upload fields', () => {
    for (const field of [
      'variants',
      'objectKeys',
      'url',
      'storage',
      'bucket',
      'prefix',
    ]) {
      rejects(() => parseUploadMetadata({ ...upload(), [field]: {} }))
    }
    rejects(() =>
      parseUploadMetadata({ ...upload(), focalPoint: { x: 1, y: 2, z: 3 } }),
    )
    rejects(() =>
      parseUploadMetadata({
        ...upload(),
        crop: { x: 0, y: 0, width: 20, height: 10, unit: 'px', focalPoint: {} },
      }),
    )
  })

  it('requires every declared field and rejects non-JSON objects', () => {
    for (const field of ['uploadId', 'filename', 'mimeType', 'filesize']) {
      const value: Record<string, unknown> = { ...upload() }
      delete value[field]
      rejects(() => parseUploadMetadata(value))
    }
    for (const value of [null, [], '', true, new Date(), new Map()]) {
      rejects(() => parseUploadMetadata(value))
    }
    rejects(() => parseUploadMetadata(Object.create(upload())))
    rejects(() => parseUploadMetadata({ ...upload(), [Symbol('extra')]: true }))
    const accessor = { ...upload() }
    Object.defineProperty(accessor, 'filename', {
      enumerable: true,
      get: () => assert.fail('A boundary parser must not invoke getters.'),
    })
    rejects(() => parseUploadMetadata(accessor))
    rejects(() =>
      parseUploadMetadata(JSON.parse('{"__proto__":{},"uploadId":"x"}')),
    )
  })

  it('rejects invalid UUIDs, unsafe filenames, and unsupported MIME declarations', () => {
    for (const uploadId of [
      '',
      'not-a-uuid',
      UPLOAD_ID.replace('-4e2b-', '-ze2b-'),
      '00000000-0000-0000-0000-000000000000',
    ]) {
      rejects(() => parseUploadMetadata({ ...upload(), uploadId }))
    }
    for (const name of [
      '',
      '.',
      '..',
      '../image.png',
      'dir/image.png',
      'dir\\image.png',
      'a\r\nb.png',
      ' image.png',
      'x'.repeat(256),
      'ảnh'.repeat(86),
    ]) {
      rejects(() => parseUploadMetadata({ ...upload(), filename: name }))
    }
    for (const mimeType of [
      'image/gif',
      'image/jpg',
      'IMAGE/PNG',
      'image/png; charset=utf-8',
      null,
    ]) {
      rejects(
        () => parseUploadMetadata({ ...upload(), mimeType }),
        'UNSUPPORTED_FORMAT',
      )
    }
  })

  it('rejects coercion, nonfinite, fractional, and oversized byte counts', () => {
    for (const filesize of [
      0,
      -1,
      0.5,
      '1234',
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      rejects(() => parseUploadMetadata({ ...upload(), filesize }))
    }
    rejects(
      () =>
        parseUploadMetadata({
          ...upload(),
          filesize: IMAGE_PROCESSING_LIMITS.maxInputBytes + 1,
        }),
      'UPLOAD_TOO_LARGE',
    )
  })

  it('rejects malformed crops, optional undefined/null values, and invalid focal coordinates', () => {
    const crop = { x: 0, y: 0, width: 50, height: 50, unit: '%' }
    for (const change of [
      { x: -1 },
      { y: NaN },
      { width: 0 },
      { height: Infinity },
      { unit: 'percent' },
      { unit: undefined },
      { rotation: NaN },
      { rotation: '90' },
      { x: 51 },
      { y: 51 },
    ]) {
      rejects(() =>
        parseUploadMetadata({ ...upload(), crop: { ...crop, ...change } }),
      )
    }
    for (const value of [null, undefined]) {
      rejects(() => parseUploadMetadata({ ...upload(), crop: value }))
      rejects(() => parseUploadMetadata({ ...upload(), focalPoint: value }))
    }
    for (const focalPoint of [
      { x: -1, y: 50 },
      { x: 50, y: 101 },
      { x: '50', y: 50 },
      { x: 0, y: Infinity },
      { x: 0 },
    ]) {
      rejects(() => parseUploadMetadata({ ...upload(), focalPoint }))
    }
  })

  it('returns independent plain data after validation', () => {
    const value = upload({ focalPoint: { x: 25, y: 75 } })
    const parsed = parseUploadMetadata(value)
    value.focalPoint!.x = 100
    assert.equal(parsed.focalPoint?.x, 25)
    assert.notEqual(parsed, value)
  })
})

describe('trusted object key plan and processing request', () => {
  it('creates immutable upload namespaces with canonical extensions', () => {
    const extensions: Record<ImageMimeType, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/avif': 'avif',
    }
    for (const [mimeType, extension] of Object.entries(extensions)) {
      const metadata = processing({ mimeType: mimeType as ImageMimeType })
      assert.equal(
        metadata.objectKeys.original,
        `media/${UPLOAD_ID}/${UPLOAD_ID}-original.${extension}`,
      )
      assert.deepEqual(parseProcessImageMetadata(metadata), metadata)
      for (const id of VARIANT_IDS) {
        assert.equal(
          metadata.objectKeys.variants[id],
          `media/${UPLOAD_ID}/${UPLOAD_ID}-${id}.webp`,
        )
      }
    }
    rejects(() => createObjectKeyPlan('../bad', 'image/png'))
  })

  it('rejects missing, extra, duplicated, foreign, or traversal keys', () => {
    const metadata = processing()
    for (const original of [
      `media/${OTHER_ID}/${OTHER_ID}-original.png`,
      '../image.png',
      metadata.objectKeys.original.replace('.png', '.jpg'),
    ]) {
      rejects(() =>
        parseProcessImageMetadata({
          ...metadata,
          objectKeys: { ...metadata.objectKeys, original },
        }),
      )
    }
    rejects(() =>
      parseProcessImageMetadata({
        ...metadata,
        objectKeys: { ...metadata.objectKeys, prefix: 'evil' },
      }),
    )
    rejects(() =>
      parseProcessImageMetadata({
        ...metadata,
        objectKeys: {
          ...metadata.objectKeys,
          variants: { ...metadata.objectKeys.variants, custom: 'x' },
        },
      }),
    )
    for (const id of VARIANT_IDS) {
      const variants: Record<string, unknown> = {
        ...metadata.objectKeys.variants,
      }
      delete variants[id]
      rejects(() =>
        parseProcessImageMetadata({
          ...metadata,
          objectKeys: { ...metadata.objectKeys, variants },
        }),
      )
      variants[id] = metadata.objectKeys.original
      rejects(() =>
        parseProcessImageMetadata({
          ...metadata,
          objectKeys: { ...metadata.objectKeys, variants },
        }),
      )
    }
  })
})

describe('container result boundary', () => {
  it('accepts measured complete results and source focal points', () => {
    for (const focalPoint of [
      undefined,
      { x: 0, y: 100 },
      { x: 25.5, y: 70 },
    ]) {
      const metadata = processing(focalPoint ? { focalPoint } : {})
      const value = result(metadata)
      assert.deepEqual(parseProcessImageResult(value, metadata), value)
    }
    const value = result()
    value.variants.square.width = 1
    value.variants.square.height = 1
    assert.deepEqual(parseProcessImageResult(value, processing()), value)
  })

  it('requires original MIME, bytes, canonical identity, and source focal to match the request', () => {
    const metadata = processing()
    const value = result(metadata)
    for (const change of [
      { mimeType: 'image/jpeg' },
      { filesize: metadata.filesize + 1 },
      { filename: metadata.filename },
      { r2Key: `media/${OTHER_ID}/original.png` },
      { extra: true },
    ]) {
      rejects(() =>
        parseProcessImageResult(
          { ...value, original: { ...value.original, ...change } },
          metadata,
        ),
      )
    }
    rejects(() =>
      parseProcessImageResult({ ...value, uploadId: OTHER_ID }, metadata),
    )
    rejects(() => parseProcessImageResult({ ...value, focalX: 51 }, metadata))
    rejects(() => parseProcessImageResult({ ...value, focalY: '50' }, metadata))
    rejects(() => parseProcessImageResult({ ...value, crop: {} }, metadata))
  })

  it('enforces positive safe integer dimensions and the 40 megapixel original limit', () => {
    const metadata = processing()
    const value = result(metadata)
    for (const dimension of [
      0,
      -1,
      1.1,
      '200',
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      rejects(() =>
        parseProcessImageResult(
          { ...value, original: { ...value.original, width: dimension } },
          metadata,
        ),
      )
      rejects(() =>
        parseProcessImageResult(
          { ...value, original: { ...value.original, height: dimension } },
          metadata,
        ),
      )
    }
    const original = { ...value.original, width: 8000, height: 5000 }
    assert.equal(
      parseProcessImageResult({ ...value, original }, metadata).original.width,
      8000,
    )
    rejects(
      () =>
        parseProcessImageResult(
          { ...value, original: { ...original, height: 5001 } },
          metadata,
        ),
      'UPLOAD_TOO_LARGE',
    )
  })

  it('requires all seven variants, with matching IDs, keys, filenames, WebP format, and exact fields', () => {
    const metadata = processing()
    const value = result(metadata)
    rejects(() =>
      parseProcessImageResult(
        { ...value, variants: { ...value.variants, custom: {} } },
        metadata,
      ),
    )
    for (const id of VARIANT_IDS) {
      const missing: Record<string, unknown> = { ...value.variants }
      delete missing[id]
      rejects(() =>
        parseProcessImageResult({ ...value, variants: missing }, metadata),
      )
      for (const change of [
        { id: 'custom' },
        { id: VARIANT_IDS.find((other) => other !== id) },
        { format: 'png' },
        { mimeType: 'image/png' },
        { r2Key: metadata.objectKeys.original },
        { filename: 'wrong.webp' },
        { filesize: 0 },
        { width: 0 },
        { height: 1.5 },
        { quality: 80 },
      ]) {
        rejects(() =>
          parseProcessImageResult(
            {
              ...value,
              variants: {
                ...value.variants,
                [id]: { ...value.variants[id], ...change },
              },
            },
            metadata,
          ),
        )
      }
    }
  })

  it('enforces each configured dimension and variant byte limit', () => {
    const metadata = processing()
    const value = result(metadata)
    for (const id of VARIANT_IDS) {
      const current = value.variants[id]
      for (const change of [
        { width: DEFAULT_VARIANTS[id].width + 1 },
        { height: DEFAULT_VARIANTS[id].height + 1 },
      ]) {
        rejects(() =>
          parseProcessImageResult(
            {
              ...value,
              variants: { ...value.variants, [id]: { ...current, ...change } },
            },
            metadata,
          ),
        )
      }
      const atLimit = {
        ...value,
        variants: {
          ...value.variants,
          [id]: {
            ...current,
            filesize: IMAGE_PROCESSING_LIMITS.maxOutputBytes,
          },
        },
      }
      assert.equal(
        parseProcessImageResult(atLimit, metadata).variants[id].filesize,
        IMAGE_PROCESSING_LIMITS.maxOutputBytes,
      )
      rejects(
        () =>
          parseProcessImageResult(
            {
              ...value,
              variants: {
                ...value.variants,
                [id]: {
                  ...current,
                  filesize: IMAGE_PROCESSING_LIMITS.maxOutputBytes + 1,
                },
              },
            },
            metadata,
          ),
        'UPLOAD_TOO_LARGE',
      )
    }
  })
})

describe('browser response boundaries', () => {
  it('accepts a complete public response without leaking private keys', () => {
    const value = response()
    assert.deepEqual(parseUploadImageResponse(value), value)
    assert.equal('r2Key' in parseUploadImageResponse(value), false)
  })

  it('rejects invalid IDs, focal values, metadata, original identity, or thumbnail URL', () => {
    const value = response()
    for (const change of [
      { mediaId: 0 },
      { mediaId: 1.5 },
      { mediaId: '5' },
      { mediaId: Number.MAX_SAFE_INTEGER + 1 },
      { uploadId: OTHER_ID },
      { focalX: -1 },
      { focalY: NaN },
      { width: 0 },
      { height: Infinity },
      { filesize: 0 },
      { filename: 'original.png' },
      { thumbnailURL: value.variants.large.url },
      { r2Key: result().original.r2Key },
      { unexpected: true },
    ]) {
      rejects(() => parseUploadImageResponse({ ...value, ...change }))
    }
  })

  it('rejects unsafe or foreign public URLs and inconsistent public bases', () => {
    const value = response()
    for (const url of [
      'javascript:alert(1)',
      'data:image/png;base64,AAAA',
      '/image.png',
      value.url.replace('https:', 'ftp:'),
      value.url.replace('https://', 'https://user:pass@'),
      `${value.url}?token=secret`,
      `${value.url}#fragment`,
      `${value.url}\n`,
      value.url.replace(UPLOAD_ID, OTHER_ID),
    ]) {
      rejects(() => parseUploadImageResponse({ ...value, url }))
    }
    const thumbnail = {
      ...value.variants.thumbnail,
      url: value.variants.thumbnail.url.replace(
        'media.example.com',
        'foreign.example.com',
      ),
    }
    rejects(() =>
      parseUploadImageResponse({
        ...value,
        thumbnailURL: thumbnail.url,
        variants: { ...value.variants, thumbnail },
      }),
    )
  })

  it('requires complete and exact public variants with validated image metadata', () => {
    const value = response()
    for (const id of VARIANT_IDS) {
      const variants: Record<string, unknown> = { ...value.variants }
      delete variants[id]
      rejects(() => parseUploadImageResponse({ ...value, variants }))
      for (const change of [
        { id: 'custom' },
        { format: 'png' },
        { mimeType: 'image/png' },
        { width: DEFAULT_VARIANTS[id].width + 1 },
        { filesize: '128' },
        { filename: 'other.webp' },
        { r2Key: 'private-key' },
        { url: value.url },
      ]) {
        rejects(() =>
          parseUploadImageResponse({
            ...value,
            variants: {
              ...value.variants,
              [id]: { ...value.variants[id], ...change },
            },
          }),
        )
      }
    }
    rejects(() =>
      parseUploadImageResponse({
        ...value,
        variants: { ...value.variants, custom: {} },
      }),
    )
  })

  it('validates every error code with an optional UUID and strict envelope', () => {
    const codes: UploadErrorCode[] = [
      'INVALID_INPUT',
      'UNSUPPORTED_FORMAT',
      'UPLOAD_TOO_LARGE',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'PROCESSOR_BUSY',
      'CONTAINER_START_FAILED',
      'PROCESSING_TIMEOUT',
      'STORAGE_FAILED',
      'PERSISTENCE_FAILED',
      'INTERNAL_ERROR',
    ]
    for (const code of codes) {
      for (const id of [{}, { uploadId: UPLOAD_ID }]) {
        const value = {
          ...id,
          error: { code, message: 'Please retry the upload.', retryable: true },
        }
        assert.deepEqual(parseUploadErrorResponse(value), value)
      }
    }
    const value = {
      error: {
        code: 'INVALID_INPUT',
        message: 'Invalid upload.',
        retryable: false,
      },
    }
    for (const change of [
      { code: 'UNKNOWN' },
      { message: '' },
      { message: '  ' },
      { message: 'x'.repeat(1025) },
      { message: 'a\nb' },
      { retryable: 'false' },
      { diagnostic: 'internal' },
    ]) {
      rejects(() =>
        parseUploadErrorResponse({ error: { ...value.error, ...change } }),
      )
    }
    rejects(() => parseUploadErrorResponse({ ...value, uploadId: 'bad' }))
    rejects(() => parseUploadErrorResponse({ ...value, uploadId: undefined }))
    rejects(() => parseUploadErrorResponse({ ...value, status: 400 }))
  })
})

describe('bounded metadata transport', () => {
  it('uses the specified URI-encoded JSON wire format and safely handles Unicode', () => {
    const value = upload({ filename: 'Ảnh 🌅 100%.png' })
    const encoded = encodeImageMetadata(value)
    assert.equal(IMAGE_METADATA_HEADER, 'x-image-metadata')
    assert.equal(encoded, encodeURIComponent(JSON.stringify(value)))
    assert.match(encoded, /^[\x20-\x7e]+$/u)
    const decoded: unknown = decodeImageMetadata(encoded)
    assert.deepEqual(parseUploadMetadata(decoded), value)
    const internal = processing()
    assert.deepEqual(
      parseProcessImageMetadata(
        decodeImageMetadata(encodeImageMetadata(internal)),
      ),
      internal,
    )
  })

  it('keeps decoding separate from shape validation', () => {
    for (const value of [null, 42, ['not', 'metadata'], { unexpected: true }]) {
      const decoded = decodeImageMetadata(encodeImageMetadata(value))
      assert.deepEqual(decoded, value)
      rejects(() => parseUploadMetadata(decoded))
    }
  })

  it('enforces 4096 bytes after encoding, including Unicode expansion', () => {
    const exact = 'x'.repeat(4090)
    assert.equal(encodeImageMetadata(exact).length, 4096)
    assert.equal(decodeImageMetadata(encodeImageMetadata(exact)), exact)
    rejects(() => encodeImageMetadata(`${exact}x`))
    rejects(() => decodeImageMetadata('x'.repeat(4097)))
    rejects(() => encodeImageMetadata('🌅'.repeat(342)))
    rejects(() => decodeImageMetadata('é'.repeat(2049)))
  })

  it('rejects missing, malformed, unserializable, and invalid Unicode headers', () => {
    for (const value of [
      null,
      undefined,
      '',
      '%',
      '%GG',
      '%E0%A4',
      '%7Bbad%7D',
      'not-json',
    ]) {
      rejects(() => decodeImageMetadata(value))
    }
    const circular: Record<string, unknown> = {}
    circular.self = circular
    for (const value of [
      undefined,
      () => null,
      Symbol('bad'),
      1n,
      circular,
      '\ud800',
    ]) {
      if (value === '\ud800') {
        // JSON.stringify escapes lone surrogates into valid ASCII JSON.
        assert.equal(decodeImageMetadata(encodeImageMetadata(value)), value)
      } else {
        rejects(() => encodeImageMetadata(value))
      }
    }
  })
})
