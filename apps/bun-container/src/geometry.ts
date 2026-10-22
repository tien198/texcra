import { ImageProcessingError } from 'shared/image-processing'
import type {
  CropData,
  FocalPoint,
  VariantConfig,
} from 'shared/image-processing'

export interface Rectangle {
  left: number
  top: number
  width: number
  height: number
}

const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value))

/** Crop coordinates always refer to the EXIF-oriented source. */
export function cropRectangle(
  width: number,
  height: number,
  crop?: CropData,
): Rectangle {
  if (!crop) return { left: 0, top: 0, width, height }
  const scaleX = crop.unit === '%' ? width / 100 : 1
  const scaleY = crop.unit === '%' ? height / 100 : 1
  const x = crop.x * scaleX
  const y = crop.y * scaleY
  const w = crop.width * scaleX
  const h = crop.height * scaleY
  if (
    ![x, y, w, h].every(Number.isFinite) ||
    x < 0 ||
    y < 0 ||
    w <= 0 ||
    h <= 0 ||
    x + w > width + 1e-8 ||
    y + h > height + 1e-8
  ) {
    throw new ImageProcessingError(
      'INVALID_INPUT',
      'Crop is outside the oriented image',
    )
  }
  const left = Math.round(x)
  const top = Math.round(y)
  const right = Math.min(width, Math.round(x + w))
  const bottom = Math.min(height, Math.round(y + h))
  if (right <= left || bottom <= top) {
    throw new ImageProcessingError(
      'INVALID_INPUT',
      'Crop must contain at least one pixel',
    )
  }
  return { left, top, width: right - left, height: bottom - top }
}

export function croppedFocal(
  width: number,
  height: number,
  crop: Rectangle,
  focal: FocalPoint,
) {
  return {
    x: clamp((width * focal.x) / 100 - crop.left, crop.width),
    y: clamp((height * focal.y) / 100 - crop.top, crop.height),
  }
}

/** Rotate continuous image coordinates about the centre, clockwise in screen space. */
export function rotatedFocal(
  focal: FocalPoint,
  width: number,
  height: number,
  outputWidth: number,
  outputHeight: number,
  rotation: number,
): FocalPoint {
  const radians = (rotation * Math.PI) / 180
  const x = focal.x - width / 2
  const y = focal.y - height / 2
  return {
    x: clamp(
      x * Math.cos(radians) - y * Math.sin(radians) + outputWidth / 2,
      outputWidth,
    ),
    y: clamp(
      x * Math.sin(radians) + y * Math.cos(radians) + outputHeight / 2,
      outputHeight,
    ),
  }
}

/** Explicit focal extraction avoids unsupported percentage strings in Sharp.position. */
export function coverRectangle(
  width: number,
  height: number,
  focal: FocalPoint,
  variant: VariantConfig,
): Rectangle {
  const ratio = variant.width / variant.height
  const cropWidth =
    width / height > ratio ? Math.max(1, Math.round(height * ratio)) : width
  const cropHeight =
    width / height > ratio ? height : Math.max(1, Math.round(width / ratio))
  return {
    left: Math.round(clamp(focal.x - cropWidth / 2, width - cropWidth)),
    top: Math.round(clamp(focal.y - cropHeight / 2, height - cropHeight)),
    width: cropWidth,
    height: cropHeight,
  }
}
