import type {
  CropData,
  FocalPoint,
  ImageMimeType,
} from 'shared/image-processing'

export interface SemanticUploadPayload {
  readonly draft_id: string
  readonly filename: string
  readonly mimeType: ImageMimeType
  readonly filesize: number
  readonly crop?: CropData
  readonly focalPoint?: FocalPoint
}

export class Rfc8785Canonicalizer {
  public canonicalize(value: unknown): string {
    if (
      value === null ||
      typeof value === 'boolean' ||
      typeof value === 'string'
    ) {
      return JSON.stringify(value)
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new TypeError(
          'RFC 8785 canonicalization does not allow NaN or Infinity.',
        )
      }
      if (Object.is(value, -0)) {
        return '0'
      }
      return JSON.stringify(value)
    }

    if (Array.isArray(value)) {
      const elements = value.map((item) =>
        this.canonicalize(item === undefined ? null : item),
      )
      return `[${elements.join(',')}]`
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>
      const keys = Object.keys(record)
        .filter((key) => record[key] !== undefined)
        .sort()

      const members = keys.map(
        (key) => `${JSON.stringify(key)}:${this.canonicalize(record[key])}`,
      )
      return `{${members.join(',')}}`
    }

    throw new TypeError(
      `Unsupported type for RFC 8785 canonicalization: ${typeof value}`,
    )
  }

  public async computeSemanticHash(
    payload: SemanticUploadPayload,
  ): Promise<string> {
    const normalizedPayload: Record<string, unknown> = {
      draft_id: payload.draft_id,
      filename: payload.filename,
      mimeType: payload.mimeType,
      filesize: payload.filesize,
      ...(payload.crop !== undefined ? { crop: payload.crop } : {}),
      ...(payload.focalPoint !== undefined
        ? { focalPoint: payload.focalPoint }
        : {}),
    }

    const canonicalJson = this.canonicalize(normalizedPayload)
    const encoded = new TextEncoder().encode(canonicalJson)
    const digestBuffer = await crypto.subtle.digest('SHA-256', encoded)
    const hashBytes = new Uint8Array(digestBuffer)

    let hex = ''
    for (const byte of hashBytes) {
      hex += byte.toString(16).padStart(2, '0')
    }
    return hex
  }
}
