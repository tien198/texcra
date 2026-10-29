import { describe, expect, test } from 'bun:test'
import type { OutputInfo } from 'sharp'
import type { SourceInfo } from '../src/processor/inspect'
import {
  toOriginalMetadata,
  toVariantMetadata,
} from '../src/processor/result-metadata'

describe('result-metadata', () => {
  test('toOriginalMetadata maps source attributes and derives filename from key', () => {
    const source: SourceInfo = {
      mimeType: 'image/jpeg',
      width: 1920,
      height: 1080,
    }
    const r2Key = 'media/user-123/original.jpg'
    const filesize = 2048576

    const result = toOriginalMetadata(r2Key, source, filesize)

    expect(result).toEqual({
      r2Key: 'media/user-123/original.jpg',
      filename: 'original.jpg',
      mimeType: 'image/jpeg',
      filesize: 2048576,
      width: 1920,
      height: 1080,
    })
  })

  test('toVariantMetadata maps webp output info and derives filename from key', () => {
    const info: OutputInfo = {
      format: 'webp',
      size: 45120,
      width: 480,
      height: 320,
      channels: 4,
      premultiplied: false,
      hasAlpha: true,
    }
    const r2Key = 'media/user-123/thumb.webp'

    const result = toVariantMetadata('thumbnail', r2Key, info)

    expect(result).toEqual({
      id: 'thumbnail',
      format: 'webp',
      mimeType: 'image/webp',
      r2Key: 'media/user-123/thumb.webp',
      filename: 'thumb.webp',
      filesize: 45120,
      width: 480,
      height: 320,
    })
  })
})
