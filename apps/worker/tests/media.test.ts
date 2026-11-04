import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getTableColumns } from 'drizzle-orm'
import { media } from 'shared'
import { createObjectKeyPlan, DEFAULT_VARIANTS, VARIANT_IDS } from 'shared/image-processing'
import type { ProcessImageResult, ProcessedVariants, VariantId } from 'shared/image-processing'
import {
  D1MediaRepository,
  MediaRecordMapper,
  MediaUrlResolver,
} from '../src/modules/media/infrastructure'

const uploadId = 'a8a73f4f-8d65-4b3a-a456-426614174000'
const publicBase = 'https://media.example.com'

function fixture(): ProcessImageResult {
  const keys = createObjectKeyPlan(uploadId, 'image/jpeg')
  function variant<TVariant extends VariantId>(id: TVariant) {
    return {
      id, format: 'webp' as const, mimeType: 'image/webp' as const,
      filename: keys.variants[id].split('/').at(-1)!, r2Key: keys.variants[id],
      width: DEFAULT_VARIANTS[id].width, height: DEFAULT_VARIANTS[id].height,
      filesize: 100 + VARIANT_IDS.indexOf(id),
    }
  }
  const variants: ProcessedVariants = {
    thumbnail: variant('thumbnail'), square: variant('square'), small: variant('small'),
    medium: variant('medium'), large: variant('large'), xlarge: variant('xlarge'), og: variant('og'),
  }
  return {
    uploadId, focalX: 12.5, focalY: 0,
    original: { filename: keys.original.split('/').at(-1)!, r2Key: keys.original,
      mimeType: 'image/jpeg', width: 2400, height: 1600, filesize: 123456 }, variants,
  }
}

function row(): typeof media.$inferSelect {
  const mapper = new MediaRecordMapper(publicBase)
  return {
    ...mapper.toInsertValues(fixture()), id: 42,
    alt: null, caption: null, folderId: null, createdAt: new Date(0), updatedAt: new Date(0),
  } as typeof media.$inferSelect
}

test('maps all seven variants into all 42 flattened columns using numeric strings', () => {
  const input = fixture()
  const mapper = new MediaRecordMapper(`${publicBase}/`)
  const values = mapper.toInsertValues(input)
  const columns = getTableColumns(media)
  assert.equal(columns.filesize.dataType, 'string numeric')
  assert.equal(columns.filesize.columnType, 'SQLiteNumeric')
  assert.equal(values.filename, input.original.filename)
  assert.equal(values.filesize, '123456')
  assert.equal(values.focalX, '12.5')
  assert.equal(values.focalY, '0')
  assert.equal(Object.keys(values).filter((key) => key.startsWith('sizes')).length, 42)
  for (const id of VARIANT_IDS) {
    const prefix = `sizes${id[0].toUpperCase()}${id.slice(1)}`
    const fields = values as Record<string, string>
    assert.equal(fields[`${prefix}Url`], `${publicBase}/${input.variants[id].r2Key}`)
    assert.equal(fields[`${prefix}Filename`], input.variants[id].filename)
    assert.equal(fields[`${prefix}MimeType`], 'image/webp')
    assert.equal(fields[`${prefix}Width`], String(input.variants[id].width))
    assert.equal(fields[`${prefix}Height`], String(input.variants[id].height))
    assert.equal(fields[`${prefix}Filesize`], String(input.variants[id].filesize))
  }
})

test('recovery round trips all measured metadata as numbers and excludes internal keys', () => {
  const mapper = new MediaRecordMapper(publicBase)
  const response = mapper.toUploadResponse(fixture(), 42)
  assert.deepEqual(mapper.fromRowToUploadResponse(row(), uploadId), response)
  assert.equal(response.thumbnailURL, response.variants.thumbnail.url)
  assert.equal(response.variants.og.mimeType, 'image/webp')
  assert.equal(JSON.stringify(response).includes('r2Key'), false)
})

test('rejects incomplete, mismatched and unsafe metadata before persistence', () => {
  const mapper = new MediaRecordMapper(publicBase)
  const result = fixture()
  result.variants.square.width = 501
  assert.throws(() => mapper.toInsertValues(result))
  result.variants.square.width = 500
  result.original.r2Key = '../outside.jpg'
  assert.throws(() => mapper.toInsertValues(result))
  assert.throws(() => new MediaRecordMapper('https://user:pass@example.com'))
  assert.throws(() => mapper.fromRowToUploadResponse({ ...row(), sizesOgFilesize: null }, uploadId))
  assert.throws(() => new MediaRecordMapper('https://other.example.com').fromRowToUploadResponse(row(), uploadId))
  assert.throws(() => mapper.fromRowToUploadResponse(row(), 'b8a73f4f-8d65-4b3a-a456-426614174000'))
})

test('MediaUrlResolver validates and resolves clean URLs', () => {
  const resolver = new MediaUrlResolver(publicBase)
  assert.equal(resolver.resolveObjectUrl('media/photo.jpg'), `${publicBase}/media/photo.jpg`)
  assert.throws(() => resolver.resolveObjectUrl('media/../hack.jpg'), /Invalid media object key/)
  assert.throws(() => resolver.assertOwnedUrl('https://evil.com/media/photo.jpg'), /does not belong/)
})

/** D1 protocol stub: exercises Drizzle SQL/binding and result mapping without a Worker runtime. */
function database(insertId: number | null, stored: ReturnType<typeof row> | null) {
  const calls: Array<{ sql: string; params: unknown[] }> = []
  const binding = {
    prepare(sql: string) {
      const call = { sql, params: [] as unknown[] }
      calls.push(call)
      return {
        bind(...params: unknown[]) {
          call.params = params
          return this
        },
        async raw() {
          if (sql.startsWith('insert')) return insertId === null ? [] : [[insertId]]
          if (!stored) return []
          return [Object.keys(getTableColumns(media)).map((key) => {
            const value = stored[key as keyof typeof stored]
            return value instanceof Date ? value.getTime() : value
          })]
        },
      }
    },
  } as unknown as D1Database
  return { binding, calls }
}

test('persists and returns the inserted ID using a unique-filename conflict guard', async () => {
  const db = database(42, null)
  const repo = new D1MediaRepository(db.binding, publicBase)
  const mapper = new MediaRecordMapper(publicBase)
  assert.deepEqual(await repo.persist(fixture()), mapper.toUploadResponse(fixture(), 42))
  assert.match(db.calls[0].sql, /on conflict \("media"\."filename"\) do nothing/)
  assert.ok(db.calls[0].params.includes(fixture().original.filename))
})

test('duplicate insert recovers a committed row by unique original filename', async () => {
  const db = database(null, row())
  const repo = new D1MediaRepository(db.binding, publicBase)
  const response = await repo.persist(fixture())
  assert.equal(response.mediaId, 42)
  assert.match(db.calls[1].sql, /where "media"\."filename" = \?/)
  assert.deepEqual(db.calls[1].params, [fixture().original.filename])
  assert.deepEqual(await repo.findByOriginalFilename(fixture().original.filename, uploadId), response)
})

test('missing filename returns null and unresolved conflicts fail', async () => {
  const db = database(null, null)
  const repo = new D1MediaRepository(db.binding, publicBase)
  assert.equal(await repo.findByOriginalFilename(fixture().original.filename, uploadId), null)
  await assert.rejects(repo.persist(fixture()), /could not be recovered/)
})

test('getInstance reuses singletons per (binding, publicBase) and isolates distinct bindings', () => {
  const dbA = database(1, null)
  const dbB = database(2, null)
  const otherBase = 'https://cdn.example.com'

  assert.equal(
    MediaUrlResolver.getInstance(publicBase),
    MediaUrlResolver.getInstance(publicBase),
  )
  assert.notEqual(
    MediaUrlResolver.getInstance(publicBase),
    MediaUrlResolver.getInstance(otherBase),
  )

  assert.equal(
    MediaRecordMapper.getInstance(publicBase),
    MediaRecordMapper.getInstance(publicBase),
  )
  assert.notEqual(
    MediaRecordMapper.getInstance(publicBase),
    MediaRecordMapper.getInstance(otherBase),
  )

  const repoA1 = D1MediaRepository.getInstance(dbA.binding, publicBase)
  const repoA2 = D1MediaRepository.getInstance(dbA.binding, publicBase)
  const repoAOtherBase = D1MediaRepository.getInstance(dbA.binding, otherBase)
  const repoB = D1MediaRepository.getInstance(dbB.binding, publicBase)

  assert.equal(repoA1, repoA2)
  assert.notEqual(repoA1, repoAOtherBase)
  assert.notEqual(repoA1, repoB)
})
