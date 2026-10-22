import type { VariantDefinitions, VariantId } from './types'

export const DEFAULT_VARIANTS = {
  thumbnail: {
    id: 'thumbnail',
    width: 300,
    height: 169,
    fit: 'cover',
    format: 'webp',
    quality: 80,
  },
  square: {
    id: 'square',
    width: 500,
    height: 500,
    fit: 'cover',
    format: 'webp',
    quality: 80,
  },
  small: {
    id: 'small',
    width: 600,
    height: 338,
    fit: 'inside',
    format: 'webp',
    quality: 80,
  },
  medium: {
    id: 'medium',
    width: 900,
    height: 506,
    fit: 'inside',
    format: 'webp',
    quality: 82,
  },
  large: {
    id: 'large',
    width: 1400,
    height: 788,
    fit: 'inside',
    format: 'webp',
    quality: 82,
  },
  xlarge: {
    id: 'xlarge',
    width: 1920,
    height: 1080,
    fit: 'inside',
    format: 'webp',
    quality: 85,
  },
  og: {
    id: 'og',
    width: 1200,
    height: 630,
    fit: 'cover',
    format: 'webp',
    quality: 85,
  },
} as const satisfies VariantDefinitions

export const VARIANT_IDS: readonly VariantId[] = Object.freeze(
  Object.keys(DEFAULT_VARIANTS) as VariantId[],
)
