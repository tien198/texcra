import { ImageProcessingError } from 'shared/image-processing'
import type { StoredImageMetadata } from 'shared/image-processing'

export interface PublicImageMetadata {
  readonly filename: string
  readonly mimeType: string
  readonly filesize: number
  readonly width: number
  readonly height: number
  readonly url: string
}

export class MediaUrlResolver {
  private static readonly instances = new Map<string, MediaUrlResolver>()

  private readonly baseUrl: URL
  private readonly normalizedBaseHref: string
  private readonly normalizedPathPrefix: string

  public constructor(publicBase: string) {
    const base = new URL(publicBase)
    if (
      !['http:', 'https:'].includes(base.protocol) ||
      base.username ||
      base.password ||
      base.search ||
      base.hash
    ) {
      throw new Error('Invalid media public base URL')
    }
    this.baseUrl = base
    this.normalizedBaseHref = base.href.replace(/\/$/, '')
    this.normalizedPathPrefix = `${base.pathname.replace(/\/$/, '')}/`
  }

  public static getInstance(publicBase: string): MediaUrlResolver {
    let instance = MediaUrlResolver.instances.get(publicBase)
    if (!instance) {
      instance = new MediaUrlResolver(publicBase)
      MediaUrlResolver.instances.set(publicBase, instance)
    }
    return instance
  }

  public static validateOrigin(value: string): string {
    let url: URL
    try {
      url = new URL(value)
    } catch {
      throw new ImageProcessingError(
        'INTERNAL_ERROR',
        'The public media origin has not been configured.',
      )
    }
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    ) {
      throw new ImageProcessingError(
        'INTERNAL_ERROR',
        'The public media origin is invalid.',
      )
    }
    return url.origin
  }

  public resolveObjectUrl(r2Key: string): string {
    const parts = r2Key.split('/')
    if (
      parts.some(
        (part) =>
          !part ||
          part === '.' ||
          part === '..' ||
          MediaUrlResolver.hasControlOrBackslash(part),
      )
    ) {
      throw new Error('Invalid media object key')
    }
    return `${this.normalizedBaseHref}/${parts.map(encodeURIComponent).join('/')}`
  }

  public assertOwnedUrl(value: string | null): string {
    if (!value) {
      throw new Error('Incomplete media URL')
    }
    const parsed = new URL(value)
    if (
      parsed.origin !== this.baseUrl.origin ||
      !parsed.pathname.startsWith(this.normalizedPathPrefix)
    ) {
      throw new Error('Media URL does not belong to the configured public base')
    }
    return value
  }

  public toPublicImage(image: StoredImageMetadata): PublicImageMetadata {
    return {
      filename: image.filename,
      mimeType: image.mimeType,
      filesize: image.filesize,
      width: image.width,
      height: image.height,
      url: this.resolveObjectUrl(image.r2Key),
    }
  }

  private static hasControlOrBackslash(part: string): boolean {
    if (part.includes('\\')) return true
    for (let i = 0; i < part.length; i++) {
      const code = part.charCodeAt(i)
      if (code <= 31 || code === 127) return true
    }
    return false
  }
}
