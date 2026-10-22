import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs, promisify } from 'node:util'
import {
  createObjectKeyPlan,
  encodeImageMetadata,
  parseUploadImageResponse,
  parseUploadMetadata,
  VARIANT_IDS,
} from 'shared/image-processing'

const exec = promisify(execFile)
const workerDirectory = fileURLToPath(new URL('..', import.meta.url))
const callerDirectory = process.env.INIT_CWD ?? process.cwd()

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      url: { type: 'string', default: 'http://localhost:3000/api/upload' },
      'persist-to': { type: 'string' },
      help: { type: 'boolean' },
    },
  })
  if (values.help) {
    console.log(
      'pnpm run worker:smoke:upload <image-path> [--url http://localhost:3000/api/upload] [--persist-to <Wrangler-state-directory>]',
    )
    console.log(
      'Uses the running local Worker and its R2/D1 state. Uploaded data is retained.',
    )
    return
  }
  assert.equal(
    positionals.length,
    1,
    'Provide exactly one image file path; use --help for usage.',
  )
  const path = resolve(callerDirectory, positionals[0])
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
  }
  const input = await readFile(path)
  const metadata = parseUploadMetadata({
    uploadId: randomUUID(),
    filename: basename(path),
    filesize: input.byteLength,
    mimeType: mimeTypes[extname(path).toLowerCase() as keyof typeof mimeTypes],
  })
  const url = new URL(values.url)
  assert.ok(
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname),
    '--url must point to the local Worker whose R2/D1 state is being checked.',
  )
  const state = values['persist-to']
    ? resolve(callerDirectory, values['persist-to'])
    : join(workerDirectory, '.wrangler/state')
  console.log(`POST ${url.href}\nuploadId: ${metadata.uploadId}`)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Origin: url.origin,
      'Content-Type': metadata.mimeType,
      'x-image-metadata': encodeImageMetadata(metadata),
    },
    body: input,
    signal: AbortSignal.timeout(180_000),
    redirect: 'error',
  })
  const text = await response.text()
  assert.equal(response.status, 200, `Upload HTTP ${response.status}: ${text}`)
  const result = parseUploadImageResponse(JSON.parse(text))
  assert.equal(result.uploadId, metadata.uploadId)
  assert.equal(result.filesize, input.byteLength)
  assert.equal(result.mimeType, metadata.mimeType)
  console.log(
    `[OK] HTTP 200: processed a new upload; mediaId=${result.mediaId}`,
  )

  async function wrangler(args: string[]) {
    const { stdout } = await exec(
      'pnpm',
      [
        '--config.verify-deps-before-run=false',
        'exec',
        'wrangler',
        ...args,
        '--local',
        '--config',
        'wrangler.toml',
        '--persist-to',
        state,
      ],
      { cwd: workerDirectory, timeout: 60_000, maxBuffer: 4 * 1024 * 1024 },
    )
    return stdout
  }

  const directory = await mkdtemp(join(tmpdir(), 'texcra-smoke-upload-'))
  try {
    const keys = createObjectKeyPlan(metadata.uploadId, metadata.mimeType)
    // Read persisted objects through Wrangler; the running Worker/container stays untouched.
    for (const [key, image] of [
      [keys.original, result],
      ...VARIANT_IDS.map(
        (id) => [keys.variants[id], result.variants[id]] as const,
      ),
    ] as const) {
      const output = join(directory, image.filename)
      await wrangler([
        'r2',
        'object',
        'get',
        `texcra-media/${key}`,
        '--file',
        output,
      ])
      const stored = await readFile(output)
      assert.equal(stored.byteLength, image.filesize, `R2 byte length: ${key}`)
      if (key === keys.original) {
        const hash = (bytes: Uint8Array) =>
          createHash('sha256').update(bytes).digest('hex')
        assert.equal(
          hash(stored),
          hash(input),
          'R2 original differs from the uploaded file',
        )
      } else {
        assert.equal(
          stored.toString('ascii', 0, 4),
          'RIFF',
          `Missing WebP RIFF header: ${key}`,
        )
        assert.equal(
          stored.toString('ascii', 8, 12),
          'WEBP',
          `Missing WebP format: ${key}`,
        )
        assert.equal(
          stored.readUInt32LE(4) + 8,
          stored.byteLength,
          `Incomplete WebP: ${key}`,
        )
      }
      assert.equal(
        new URL(image.url).pathname,
        `/${key}`,
        `Response URL: ${key}`,
      )
      console.log(`[OK] R2 ${image.filename}: ${stored.byteLength} bytes`)
    }

    const sql = `SELECT * FROM media WHERE filename = '${keys.original.split('/').at(-1)}'`
    const queries: Array<{
      success: boolean
      results: Array<Record<string, unknown>>
    }> = JSON.parse(
      await wrangler(['d1', 'execute', 'DB', '--command', sql, '--json']),
    )
    assert.equal(queries.length, 1, 'Expected one D1 query result')
    assert.equal(queries[0].success, true, 'D1 query failed')
    assert.equal(
      queries[0].results.length,
      1,
      'Expected exactly one D1 media row',
    )
    const row = queries[0].results[0]
    assert.equal(row.id, result.mediaId, 'D1 mediaId')
    assert.equal(row.thumbnail_u_r_l, result.thumbnailURL, 'D1 thumbnail URL')
    assert.equal(Number(row.focal_x), result.focalX, 'D1 focalX')
    assert.equal(Number(row.focal_y), result.focalY, 'D1 focalY')
    for (const [prefix, image] of [
      ['', result],
      ...VARIANT_IDS.map(
        (id) => [`sizes_${id}_`, result.variants[id]] as const,
      ),
    ] as const) {
      for (const [column, expected] of Object.entries({
        url: image.url,
        filename: image.filename,
        mime_type: image.mimeType,
        filesize: image.filesize,
        width: image.width,
        height: image.height,
      })) {
        const actual = row[`${prefix}${column}`]
        assert.ok(
          actual !== null && actual !== undefined,
          `Missing D1 ${prefix}${column}`,
        )
        assert.equal(
          typeof expected === 'number' ? Number(actual) : actual,
          expected,
          `D1 ${prefix}${column}`,
        )
      }
    }
    console.log(
      `[OK] D1 media ${result.mediaId}: original and all 7 variant records match the response`,
    )
    console.log(JSON.stringify(result, null, 2))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

main().catch((error: unknown) => {
  console.error(
    `[FAIL] ${error instanceof Error ? error.message : String(error)}`,
  )
  if (error instanceof Error && error.cause instanceof AggregateError) {
    for (const cause of error.cause.errors) console.error(cause.message)
  } else if (error instanceof Error && error.cause instanceof Error) {
    console.error(error.cause.message)
  }
  process.exitCode = 1
})
