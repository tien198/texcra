import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { getPlatformProxy } from 'wrangler'
import {
  createObjectKeyPlan,
  DEFAULT_VARIANTS,
  parseProcessImageResult,
  VARIANT_IDS,
} from 'shared/image-processing'
import {
  findMediaByOriginalFilename,
  persistMedia,
  resultToUploadResponse,
} from '../src/server/media'

test('persists and recovers all image metadata through a real local D1 binding', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'texcra-image-d1-'))
  let dispose: (() => Promise<void>) | undefined
  try {
    const configPath = join(directory, 'wrangler.json')
    await writeFile(
      configPath,
      JSON.stringify({
        name: 'texcra-image-d1-test',
        compatibility_date: '2026-10-06',
        d1_databases: [
          {
            binding: 'DB',
            database_name: 'image-test',
            database_id: '00000000-0000-4000-8000-000000000001',
          },
        ],
      }),
    )
    const proxy = await getPlatformProxy<{ DB: D1Database }>({
      configPath,
      persist: { path: join(directory, 'state') },
    })
    dispose = proxy.dispose
    const migration = await readFile(
      new URL(
        '../drizzle/20261007141913_friendly_dormammu/migration.sql',
        import.meta.url,
      ),
      'utf8',
    )
    for (const statement of migration
      .split('--> statement-breakpoint')
      .filter((value) => value.trim())) {
      await proxy.env.DB.prepare(statement).run()
    }
    const uploadId = 'a8a73f4f-8d65-4b3a-a456-426614174000'
    const keys = createObjectKeyPlan(uploadId, 'image/jpeg')
    const metadata = {
      uploadId,
      filename: 'photo.jpg',
      mimeType: 'image/jpeg' as const,
      filesize: 123456,
      objectKeys: keys,
      focalPoint: { x: 12.5, y: 0 },
    }
    const result = parseProcessImageResult(
      {
        uploadId,
        focalX: 12.5,
        focalY: 0,
        original: {
          filename: keys.original.split('/').at(-1),
          r2Key: keys.original,
          mimeType: 'image/jpeg',
          width: 2400,
          height: 1600,
          filesize: metadata.filesize,
        },
        variants: Object.fromEntries(
          VARIANT_IDS.map((id) => [
            id,
            {
              id,
              format: 'webp',
              mimeType: 'image/webp',
              r2Key: keys.variants[id],
              filename: keys.variants[id].split('/').at(-1),
              width: DEFAULT_VARIANTS[id].width,
              height: DEFAULT_VARIANTS[id].height,
              filesize: 100 + VARIANT_IDS.indexOf(id),
            },
          ]),
        ),
      },
      metadata,
    )
    const publicBase = 'https://media.example.test'
    const inserted = await persistMedia(proxy.env.DB, result, publicBase)
    assert.deepEqual(
      inserted,
      resultToUploadResponse(result, inserted.mediaId, publicBase),
    )
    assert.deepEqual(
      await findMediaByOriginalFilename(
        proxy.env.DB,
        result.original.filename,
        uploadId,
        publicBase,
      ),
      inserted,
    )
    assert.deepEqual(
      await persistMedia(proxy.env.DB, result, publicBase),
      inserted,
    )
    const count = await proxy.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM media',
    ).first<number>('count')
    assert.equal(count, 1)
    assert.equal(
      await findMediaByOriginalFilename(
        proxy.env.DB,
        'missing.jpg',
        uploadId,
        publicBase,
      ),
      null,
    )
  } finally {
    await dispose?.()
    await rm(directory, { recursive: true, force: true })
  }
})
