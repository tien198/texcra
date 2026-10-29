import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FillFirstBinPackerAdapter } from '../src/core/adapters/fill-first-bin-packer.adapter'
import { SemanticShardRouterAdapter } from '../src/core/adapters/semantic-shard-router.adapter'
import { Rfc8785Canonicalizer } from '../src/core/idempotency/rfc8785-canonicalizer'
import type { SidecarNodeState } from '../src/core/ports/bin-packer.port'

test('Rfc8785Canonicalizer canonicalizes keys in UTF-16 code unit order and normalizes -0', async () => {
  const canonicalizer = new Rfc8785Canonicalizer()

  const canonical = canonicalizer.canonicalize({
    z: 1,
    a: -0,
    nested: {
      b: true,
      a: null,
      ignored: undefined,
    },
    list: [1, undefined, 'x'],
  })

  assert.equal(
    canonical,
    '{"a":0,"list":[1,null,"x"],"nested":{"a":null,"b":true},"z":1}',
  )
  assert.throws(() => canonicalizer.canonicalize(Number.NaN), TypeError)
  assert.throws(
    () => canonicalizer.canonicalize(Number.POSITIVE_INFINITY),
    TypeError,
  )
})

test('Rfc8785Canonicalizer produces identical SHA-256 semantic hashes regardless of property insertion order and distinguishes draft_id', async () => {
  const canonicalizer = new Rfc8785Canonicalizer()

  const hashA = await canonicalizer.computeSemanticHash({
    draft_id: 'draft-100',
    filename: 'hero.png',
    mimeType: 'image/png',
    filesize: 4096,
    crop: { x: 10, y: 20, width: 50, height: 50, unit: '%', rotation: 0 },
    focalPoint: { x: 50, y: 50 },
  })

  const hashB = await canonicalizer.computeSemanticHash({
    focalPoint: { y: 50, x: 50 },
    filesize: 4096,
    mimeType: 'image/png',
    filename: 'hero.png',
    draft_id: 'draft-100',
    crop: { unit: '%', width: 50, height: 50, y: 20, x: 10, rotation: 0 },
  })

  const hashDifferentDraft = await canonicalizer.computeSemanticHash({
    draft_id: 'draft-200',
    filename: 'hero.png',
    mimeType: 'image/png',
    filesize: 4096,
    crop: { x: 10, y: 20, width: 50, height: 50, unit: '%', rotation: 0 },
    focalPoint: { x: 50, y: 50 },
  })

  assert.match(hashA, /^[0-9a-f]{64}$/)
  assert.equal(hashA, hashB)
  assert.notEqual(hashA, hashDifferentDraft)
})

test('SemanticShardRouterAdapter deterministically routes SHA-256 hashes across coordinator shards', () => {
  const router = new SemanticShardRouterAdapter(5, 'coordinator-shard')
  const hash0 = '00000005' + 'a'.repeat(56) // 5 % 5 === 0
  const hash3 = '00000008' + 'b'.repeat(56) // 8 % 5 === 3

  assert.equal(router.resolveShardName(hash0), 'coordinator-shard-0')
  assert.equal(router.resolveShardName(hash3), 'coordinator-shard-3')
  assert.throws(() => router.resolveShardName('not-a-hex-hash'), TypeError)
  assert.throws(() => new SemanticShardRouterAdapter(0), RangeError)
})

test('FillFirstBinPackerAdapter prioritizes warm nodes, then highest activeLoad (fill-first), then nodeId', () => {
  const packer = new FillFirstBinPackerAdapter()
  const pool: SidecarNodeState[] = [
    {
      nodeId: 'container-sidecar-0',
      activeLoad: 1,
      maxCapacity: 1,
      isWarm: true,
    }, // Full
    {
      nodeId: 'container-sidecar-1',
      activeLoad: 0,
      maxCapacity: 1,
      isWarm: false,
    }, // Cold idle
    {
      nodeId: 'container-sidecar-2',
      activeLoad: 0,
      maxCapacity: 1,
      isWarm: true,
    }, // Warm idle
    {
      nodeId: 'container-sidecar-3',
      activeLoad: 0,
      maxCapacity: 1,
      isWarm: true,
    }, // Warm idle (higher index)
    {
      nodeId: 'container-sidecar-4',
      activeLoad: 0,
      maxCapacity: 1,
      isWarm: false,
    }, // Cold idle
  ]

  const ranked = packer.rankNodes(pool, 1)
  assert.deepEqual(
    ranked.map((n) => n.nodeId),
    [
      'container-sidecar-2',
      'container-sidecar-3',
      'container-sidecar-1',
      'container-sidecar-4',
    ],
  )
  assert.equal(packer.selectNode(pool, 1)?.nodeId, 'container-sidecar-2')

  // Multi-capacity fill-first verification: packs partially-filled warm bin before empty warm bin
  const multiCapPool: SidecarNodeState[] = [
    {
      nodeId: 'container-sidecar-0',
      activeLoad: 1,
      maxCapacity: 4,
      isWarm: true,
    },
    {
      nodeId: 'container-sidecar-1',
      activeLoad: 3,
      maxCapacity: 4,
      isWarm: true,
    },
    {
      nodeId: 'container-sidecar-2',
      activeLoad: 4,
      maxCapacity: 4,
      isWarm: true,
    },
  ]
  assert.equal(
    packer.selectNode(multiCapPool, 1)?.nodeId,
    'container-sidecar-1',
  )
})
