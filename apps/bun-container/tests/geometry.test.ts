import { expect, test } from 'bun:test'
import { DEFAULT_VARIANTS } from 'shared/image-processing'
import {
  coverRectangle,
  croppedFocal,
  cropRectangle,
  rotatedFocal,
} from '../src/geometry'

test('crop converts percentages and rejects empty pixel rounding', () => {
  expect(
    cropRectangle(400, 200, { unit: '%', x: 25, y: 10, width: 50, height: 50 }),
  ).toEqual({ left: 100, top: 20, width: 200, height: 100 })
  expect(() =>
    cropRectangle(10, 10, { unit: 'px', x: 0, y: 0, width: 0.1, height: 1 }),
  ).toThrow()
})

test('focal point follows crop, clockwise rotation, and bounded cover extraction', () => {
  const crop = { left: 100, top: 20, width: 200, height: 100 }
  const focal = croppedFocal(400, 200, crop, { x: 75, y: 50 })
  expect(focal).toEqual({ x: 200, y: 80 })
  const rotated = rotatedFocal(focal, 200, 100, 100, 200, 90)
  expect(rotated.x).toBeCloseTo(20)
  expect(rotated.y).toBeCloseTo(200)
  expect(coverRectangle(100, 200, rotated, DEFAULT_VARIANTS.square)).toEqual({
    left: 0,
    top: 100,
    width: 100,
    height: 100,
  })
})

test('crop defaults to full image and rejects out-of-bounds crops', () => {
  expect(cropRectangle(500, 300)).toEqual({
    left: 0,
    top: 0,
    width: 500,
    height: 300,
  })
  expect(
    cropRectangle(500, 300, { unit: '%', x: 0, y: 0, width: 100, height: 100 }),
  ).toEqual({ left: 0, top: 0, width: 500, height: 300 })
  expect(() =>
    cropRectangle(500, 300, {
      unit: 'px',
      x: 400,
      y: 0,
      width: 150,
      height: 100,
    }),
  ).toThrow()
  expect(() =>
    cropRectangle(500, 300, {
      unit: 'px',
      x: -10,
      y: 0,
      width: 100,
      height: 100,
    }),
  ).toThrow()
  expect(() =>
    cropRectangle(500, 300, { unit: 'px', x: 0, y: 0, width: 0, height: 100 }),
  ).toThrow()
})

test('focal point rotation handles 0, 180, and 270 degrees', () => {
  const focal = { x: 150, y: 80 }
  const r0 = rotatedFocal(focal, 200, 100, 200, 100, 0)
  expect(r0.x).toBeCloseTo(150)
  expect(r0.y).toBeCloseTo(80)

  const r180 = rotatedFocal(focal, 200, 100, 200, 100, 180)
  expect(r180.x).toBeCloseTo(50)
  expect(r180.y).toBeCloseTo(20)

  const r270 = rotatedFocal(focal, 200, 100, 100, 200, 270)
  expect(r270.x).toBeCloseTo(80)
  expect(r270.y).toBeCloseTo(50)
})

test('coverRectangle preserves aspect ratio and clamps to boundaries', () => {
  const leftFocal = { x: 0, y: 50 }
  expect(coverRectangle(400, 100, leftFocal, DEFAULT_VARIANTS.square)).toEqual({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  })
  const rightFocal = { x: 400, y: 50 }
  expect(coverRectangle(400, 100, rightFocal, DEFAULT_VARIANTS.square)).toEqual(
    { left: 300, top: 0, width: 100, height: 100 },
  )

  const topFocal = { x: 50, y: 0 }
  const thumbCover = coverRectangle(
    100,
    400,
    topFocal,
    DEFAULT_VARIANTS.thumbnail,
  )
  expect(thumbCover.left).toBe(0)
  expect(thumbCover.top).toBe(0)
  expect(thumbCover.width).toBe(100)
  expect(thumbCover.height).toBe(Math.round(100 / (300 / 169)))

  const ogCover = coverRectangle(80, 80, { x: 40, y: 40 }, DEFAULT_VARIANTS.og)
  expect(ogCover.width).toBe(80)
  expect(ogCover.height).toBe(Math.round(80 / (1200 / 630)))
  expect(ogCover.left).toBe(0)
  expect(ogCover.top + ogCover.height).toBeLessThanOrEqual(80)
})
