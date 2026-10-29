import { spyOn } from 'bun:test'
import assert from 'node:assert/strict'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import {
  encodeImageMetadata,
  IMAGE_METADATA_HEADER,
  parseProcessImageResult,
} from 'shared/image-processing'
import { app } from '../src/app'
import { storage } from '../src/storage'
import { DiskStorage, imageMetadata } from './helpers'

const directory = await mkdtemp(join(tmpdir(), 'texcra-large-'))
let sample: ReturnType<typeof setInterval> | undefined
const diskStorage = new DiskStorage(directory)
const putSpy = spyOn(storage, 'putObject').mockImplementation((obj, sig) =>
  diskStorage.putObject(obj, sig),
)
try {
  const source = join(directory, 'noise.png')
  // Generate native noise directly to disk; no JS array contains the full image.
  await sharp({
    create: {
      width: 2500,
      height: 2000,
      channels: 3,
      background: 'black',
      noise: { type: 'gaussian', mean: 128, sigma: 60 },
    },
  })
    .png({ compressionLevel: 0 })
    .toFile(source)
  const metadata = await imageMetadata(source)
  assert(
    metadata.filesize >= 10 * 1024 * 1024 &&
      metadata.filesize <= 20 * 1024 * 1024,
  )
  app.listen({ hostname: '127.0.0.1', port: 0 })
  const baseline = process.memoryUsage().rss
  let peakRss = baseline
  let peakHeap = process.memoryUsage().heapUsed
  sample = setInterval(() => {
    const memory = process.memoryUsage()
    peakRss = Math.max(peakRss, memory.rss)
    peakHeap = Math.max(peakHeap, memory.heapUsed)
  }, 10)
  const started = performance.now()
  const response = await fetch(new URL('/process', app.server!.url), {
    method: 'POST',
    headers: {
      [IMAGE_METADATA_HEADER]: encodeImageMetadata(metadata),
      'content-type': metadata.mimeType,
    },
    body: Bun.file(source),
  })
  assert.equal(response.status, 200, await response.clone().text())
  const result = parseProcessImageResult(await response.json(), metadata)
  assert.equal(diskStorage.paths.size, 8)
  assert.equal(diskStorage.maxActive, 1)
  assert(
    !(await readdir(directory)).some((name) =>
      name.startsWith('texcra-image-'),
    ),
  )
  console.log(
    JSON.stringify(
      {
        bun: Bun.version,
        sharp: sharp.versions.sharp,
        inputBytes: metadata.filesize,
        elapsedMs: Math.round(performance.now() - started),
        baselineRssBytes: baseline,
        peakRssBytes: peakRss,
        rssGrowthBytes: peakRss - baseline,
        peakJsHeapBytes: peakHeap,
        processMaxRssKiB: process.resourceUsage().maxRSS,
        outputs: Object.fromEntries(
          Object.entries(result.variants).map(([id, value]) => [
            id,
            value.filesize,
          ]),
        ),
        note: 'Single Bun process includes HTTP client, fixture generation, processor, and disk sink; Worker memory requires separate integration measurement.',
      },
      null,
      2,
    ),
  )
} finally {
  if (sample) clearInterval(sample)
  putSpy.mockRestore()
  await app.stop(true)
  await rm(directory, { recursive: true, force: true })
}
