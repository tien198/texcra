import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  DEFAULT_VARIANTS,
  ImageProcessingError,
  VARIANT_IDS,
  createObjectKeyPlan,
} from 'shared/image-processing'
import type {
  ProcessImageMetadata,
  ProcessImageResult,
  ProcessedVariants,
  UploadImageResponse,
  VariantId,
} from 'shared/image-processing'
import { ImageJobCoordinator } from '../src/server/image-job-coordinator'
import { SqliteImageJobStore } from '../src/server/image-job-store'
import type { ImageJob } from '../src/server/image-job-types'
import { resultToUploadResponse } from '../src/server/media'

const uploadId = 'a8a73f4f-8d65-4b3a-a456-426614174000'
const publicBase = 'https://media.example.com'

class InMemoryImageJobStore extends SqliteImageJobStore {
  readonly storageSql: SqlStorage

  constructor() {
    const values = new Map<string, string>()
    // This test double implements only the SQL statements used by the job journal.
    const sql = {
      exec(query: string, key?: string, value?: string) {
        const rows: Array<{ value: string }> = []
        if (query.startsWith('CREATE TABLE')) {
          return { toArray: () => rows }
        }
        assert.ok(key)
        if (query.startsWith('SELECT')) {
          const stored = values.get(key)
          if (stored !== undefined) rows.push({ value: stored })
        } else if (query.startsWith('INSERT')) {
          assert.equal(typeof value, 'string')
          values.set(key, value!)
        } else if (query.startsWith('DELETE')) {
          values.delete(key)
        } else {
          assert.fail('Unexpected journal SQL: ' + query)
        }
        return { toArray: () => rows }
      },
    } as SqlStorage
    super(sql)
    this.storageSql = sql
  }
}

class TestImageJobOperations {
  processFn?: (
    job: ImageJob,
    body: ReadableStream<Uint8Array>,
    signal: AbortSignal,
  ) => Promise<unknown>
  stopCalls = 0
  stopFn?: () => Promise<void>
  removeObjectsCalls: ProcessImageMetadata[] = []
  removeObjectsFn?: (metadata: ProcessImageMetadata) => Promise<void>
  persistCalls: ProcessImageResult[] = []
  persistFn?: (result: ProcessImageResult) => Promise<UploadImageResponse>
  committedResponses = new Map<string, UploadImageResponse>()
  alarms: Array<number | null> = []
  reports: Array<{ error: unknown; job: ImageJob }> = []

  async process(
    job: ImageJob,
    body: ReadableStream<Uint8Array>,
    signal: AbortSignal,
  ): Promise<unknown> {
    if (this.processFn) return this.processFn(job, body, signal)
    throw new Error('process not implemented')
  }

  async stop(): Promise<void> {
    this.stopCalls++
    if (this.stopFn) await this.stopFn()
  }

  async findCommitted(
    metadata: ProcessImageMetadata,
  ): Promise<UploadImageResponse | null> {
    return this.committedResponses.get(metadata.uploadId) ?? null
  }

  async persist(result: ProcessImageResult): Promise<UploadImageResponse> {
    this.persistCalls.push(result)
    if (this.persistFn) return this.persistFn(result)
    return resultToUploadResponse(result, 1, publicBase)
  }

  async removeObjects(metadata: ProcessImageMetadata): Promise<void> {
    this.removeObjectsCalls.push(metadata)
    if (this.removeObjectsFn) await this.removeObjectsFn(metadata)
  }

  async setAlarm(time: number | null): Promise<void> {
    this.alarms.push(time)
  }

  report(error: unknown, job: ImageJob): void {
    this.reports.push({ error, job })
  }
}

// Fault-injection tests override I/O; production initializes directly from ctx and env.
class TestImageJobCoordinator extends ImageJobCoordinator {
  constructor(
    store: InMemoryImageJobStore,
    private readonly operations: TestImageJobOperations,
  ) {
    super(
      { storage: { sql: store.storageSql } } as DurableObjectState,
      {} as Env,
    )
  }

  protected override process(
    job: ImageJob,
    body: ReadableStream<Uint8Array>,
    signal: AbortSignal,
  ): Promise<unknown> {
    return this.operations.process(job, body, signal)
  }

  protected override stop(): Promise<void> {
    return this.operations.stop()
  }

  protected override findCommitted(
    metadata: ProcessImageMetadata,
  ): Promise<UploadImageResponse | null> {
    return this.operations.findCommitted(metadata)
  }

  protected override persist(
    result: ProcessImageResult,
  ): Promise<UploadImageResponse> {
    return this.operations.persist(result)
  }

  protected override removeObjects(
    metadata: ProcessImageMetadata,
  ): Promise<void> {
    return this.operations.removeObjects(metadata)
  }

  protected override setAlarm(time: number | null): Promise<void> {
    return this.operations.setAlarm(time)
  }

  protected override report(error: unknown, job: ImageJob): void {
    this.operations.report(error, job)
  }
}

function fixtureMetadata(id = uploadId): ProcessImageMetadata {
  return {
    uploadId: id,
    filename: 'photo.jpg',
    mimeType: 'image/jpeg',
    filesize: 12345,
    objectKeys: createObjectKeyPlan(id, 'image/jpeg'),
  }
}

function fixtureResult(meta: ProcessImageMetadata): ProcessImageResult {
  function variant<TVariant extends VariantId>(id: TVariant) {
    return {
      id,
      format: 'webp' as const,
      mimeType: 'image/webp' as const,
      filename: meta.objectKeys.variants[id].split('/').at(-1)!,
      r2Key: meta.objectKeys.variants[id],
      width: DEFAULT_VARIANTS[id].width,
      height: DEFAULT_VARIANTS[id].height,
      filesize: 1000,
    }
  }
  const variants: ProcessedVariants = {
    thumbnail: variant('thumbnail'),
    square: variant('square'),
    small: variant('small'),
    medium: variant('medium'),
    large: variant('large'),
    xlarge: variant('xlarge'),
    og: variant('og'),
  }
  return {
    uploadId: meta.uploadId,
    focalX: 50,
    focalY: 50,
    original: {
      filename: meta.objectKeys.original.split('/').at(-1)!,
      r2Key: meta.objectKeys.original,
      mimeType: meta.mimeType,
      width: 1920,
      height: 1080,
      filesize: meta.filesize,
    },
    variants,
  }
}

function dummyBody(): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]))
      controller.close()
    },
  })
}

function writeAllReceipts(
  coordinator: ImageJobCoordinator,
  attemptId: string,
  metadata: ProcessImageMetadata,
  variantSize = 1000,
) {
  const origToken = coordinator.beginWrite(
    attemptId,
    metadata.objectKeys.original,
    metadata.filesize,
    metadata.mimeType,
  )
  coordinator.finishWrite(
    attemptId,
    metadata.objectKeys.original,
    origToken,
    true,
  )

  for (const id of VARIANT_IDS) {
    const key = metadata.objectKeys.variants[id]
    const token = coordinator.beginWrite(
      attemptId,
      key,
      variantSize,
      'image/webp',
    )
    coordinator.finishWrite(attemptId, key, token, true)
  }
}

test('success with eight write receipts', async () => {
  const store = new InMemoryImageJobStore()
  const operations = new TestImageJobOperations()
  const coordinator = new TestImageJobCoordinator(store, operations)
  const meta = fixtureMetadata()
  const res = fixtureResult(meta)

  operations.processFn = async (job) => {
    writeAllReceipts(coordinator, job.attemptId, meta)
    return res
  }

  const signal = new AbortController().signal
  const response = await coordinator.run(meta, dummyBody(), signal)

  assert.equal(response.uploadId, meta.uploadId)
  assert.equal(response.mediaId, 1)
  assert.equal(operations.persistCalls.length, 1)
  assert.equal(operations.alarms.at(-1), null)
  assert.equal(store.getActive(), undefined)
  assert.equal(
    store.getCompleted(meta.uploadId)?.response.uploadId,
    meta.uploadId,
  )
  assert.equal(operations.removeObjectsCalls.length, 0)
})

test('completed replay without processing', async () => {
  const store = new InMemoryImageJobStore()
  const operations = new TestImageJobOperations()
  const coordinator = new TestImageJobCoordinator(store, operations)
  const meta = fixtureMetadata()
  const res = fixtureResult(meta)
  const initialResponse = resultToUploadResponse(res, 42, publicBase)

  // 1: store has completed record
  store.putCompleted(meta.uploadId, {
    metadata: meta,
    response: initialResponse,
  })

  const signal = new AbortController().signal
  const replayResponse = await coordinator.run(meta, dummyBody(), signal)

  assert.deepEqual(replayResponse, initialResponse)
  assert.equal(operations.persistCalls.length, 0)
  assert.equal(operations.processFn, undefined)

  // 2: store completed is missing, but D1 has committed record
  const store2 = new InMemoryImageJobStore()
  const operations2 = new TestImageJobOperations()
  const coordinator2 = new TestImageJobCoordinator(store2, operations2)
  operations2.committedResponses.set(meta.uploadId, initialResponse)

  const d1ReplayResponse = await coordinator2.run(meta, dummyBody(), signal)
  assert.deepEqual(d1ReplayResponse, initialResponse)
  assert.deepEqual(
    store2.getCompleted(meta.uploadId)?.response,
    initialResponse,
  )
  assert.equal(operations2.persistCalls.length, 0)
})

test('busy rejection before body reads', async () => {
  const store = new InMemoryImageJobStore()
  const operations = new TestImageJobOperations()
  const coordinator = new TestImageJobCoordinator(store, operations)
  const meta1 = fixtureMetadata('11111111-1111-4111-8111-111111111111')
  const meta2 = fixtureMetadata('22222222-2222-4222-8222-222222222222')

  let notifyProcessStarted!: () => void
  const processStarted = new Promise<void>((resolve) => {
    notifyProcessStarted = resolve
  })

  let finishProcess!: () => void
  const processPromise = new Promise<ProcessImageResult>((resolve) => {
    finishProcess = () => {
      writeAllReceipts(coordinator, store.getActive()!.attemptId, meta1)
      resolve(fixtureResult(meta1))
    }
  })
  operations.processFn = async () => {
    notifyProcessStarted()
    return processPromise
  }

  const signal = new AbortController().signal
  const firstRun = coordinator.run(meta1, dummyBody(), signal)

  await processStarted

  assert.ok(store.getActive())

  let secondBodyRead = false
  const secondBody = new ReadableStream<Uint8Array>(
    {
      pull() {
        secondBodyRead = true
      },
    },
    { highWaterMark: 0 },
  )

  await assert.rejects(
    coordinator.run(meta2, secondBody, signal),
    (err: unknown) => {
      assert.ok(err instanceof ImageProcessingError)
      assert.equal(err.code, 'PROCESSOR_BUSY')
      return true
    },
  )

  assert.equal(secondBody.locked, false)
  assert.equal(secondBodyRead, false)

  finishProcess()
  await firstRun
})

test('changed-metadata replay rejection', async () => {
  const store = new InMemoryImageJobStore()
  const operations = new TestImageJobOperations()
  const coordinator = new TestImageJobCoordinator(store, operations)
  const meta = fixtureMetadata()
  const res = fixtureResult(meta)

  store.putCompleted(meta.uploadId, {
    metadata: meta,
    response: resultToUploadResponse(res, 1, publicBase),
  })

  const changedMeta: ProcessImageMetadata = {
    ...meta,
    filesize: meta.filesize + 100,
  }

  const signal = new AbortController().signal
  await assert.rejects(
    coordinator.run(changedMeta, dummyBody(), signal),
    (err: unknown) => {
      assert.ok(err instanceof ImageProcessingError)
      assert.equal(err.code, 'INVALID_INPUT')
      assert.match(err.message, /different metadata/)
      return true
    },
  )
})

test('write lease scoping and stale token denial', async () => {
  const store = new InMemoryImageJobStore()
  const operations = new TestImageJobOperations()
  const coordinator = new TestImageJobCoordinator(store, operations)
  const meta = fixtureMetadata()

  // 1: beginWrite when no job is active
  assert.throws(
    () =>
      coordinator.beginWrite(
        'wrong-attempt',
        meta.objectKeys.original,
        meta.filesize,
        meta.mimeType,
      ),
    (err: unknown) =>
      err instanceof ImageProcessingError && err.code === 'FORBIDDEN',
  )

  operations.processFn = async (job) => {
    // 2: wrong attemptId
    assert.throws(
      () =>
        coordinator.beginWrite(
          'bad-attempt-id',
          meta.objectKeys.original,
          meta.filesize,
          meta.mimeType,
        ),
      (err: unknown) =>
        err instanceof ImageProcessingError && err.code === 'FORBIDDEN',
    )

    // 3: foreign key not in plan
    assert.throws(
      () =>
        coordinator.beginWrite(
          job.attemptId,
          'media/other/unknown.webp',
          100,
          'image/webp',
        ),
      (err: unknown) =>
        err instanceof ImageProcessingError && err.code === 'FORBIDDEN',
    )

    // 4: original size mismatch
    assert.throws(
      () =>
        coordinator.beginWrite(
          job.attemptId,
          meta.objectKeys.original,
          meta.filesize + 1,
          meta.mimeType,
        ),
      (err: unknown) =>
        err instanceof ImageProcessingError && err.code === 'INVALID_INPUT',
    )

    // 5: original mimeType mismatch
    assert.throws(
      () =>
        coordinator.beginWrite(
          job.attemptId,
          meta.objectKeys.original,
          meta.filesize,
          'image/png',
        ),
      (err: unknown) =>
        err instanceof ImageProcessingError && err.code === 'INVALID_INPUT',
    )

    // 6: variant mimeType mismatch
    assert.throws(
      () =>
        coordinator.beginWrite(
          job.attemptId,
          meta.objectKeys.variants.thumbnail,
          1000,
          'image/png',
        ),
      (err: unknown) =>
        err instanceof ImageProcessingError && err.code === 'INVALID_INPUT',
    )

    // 7: duplicate beginWrite while pending
    const token = coordinator.beginWrite(
      job.attemptId,
      meta.objectKeys.original,
      meta.filesize,
      meta.mimeType,
    )
    assert.throws(
      () =>
        coordinator.beginWrite(
          job.attemptId,
          meta.objectKeys.original,
          meta.filesize,
          meta.mimeType,
        ),
      (err: unknown) =>
        err instanceof ImageProcessingError && err.code === 'FORBIDDEN',
    )

    // 8: finishWrite with stale/wrong token has no effect
    coordinator.finishWrite(
      job.attemptId,
      meta.objectKeys.original,
      'stale-token-xyz',
      true,
    )
    const activeJob = store.getActive()!
    assert.ok(activeJob.pending[meta.objectKeys.original])
    assert.equal(activeJob.written[meta.objectKeys.original], undefined)

    // Finish properly
    coordinator.finishWrite(
      job.attemptId,
      meta.objectKeys.original,
      token,
      true,
    )

    // Now key is in written; duplicate beginWrite is still forbidden
    assert.throws(
      () =>
        coordinator.beginWrite(
          job.attemptId,
          meta.objectKeys.original,
          meta.filesize,
          meta.mimeType,
        ),
      (err: unknown) =>
        err instanceof ImageProcessingError && err.code === 'FORBIDDEN',
    )

    // Only 1 of 8 writes done; returning result causes receipt validation failure
    return fixtureResult(meta)
  }

  const signal = new AbortController().signal
  await assert.rejects(
    coordinator.run(meta, dummyBody(), signal),
    (err: unknown) =>
      err instanceof ImageProcessingError && err.code === 'STORAGE_FAILED',
  )
})

test('partial failure and restart cleanup', async () => {
  // 1: partial failure during run
  const store = new InMemoryImageJobStore()
  const operations = new TestImageJobOperations()
  const coordinator = new TestImageJobCoordinator(store, operations)
  const meta = fixtureMetadata()

  operations.processFn = async (job) => {
    const token = coordinator.beginWrite(
      job.attemptId,
      meta.objectKeys.original,
      meta.filesize,
      meta.mimeType,
    )
    coordinator.finishWrite(
      job.attemptId,
      meta.objectKeys.original,
      token,
      true,
    )
    throw new Error('Sharp crash mid-processing')
  }

  const signal = new AbortController().signal
  await assert.rejects(
    coordinator.run(meta, dummyBody(), signal),
    /Sharp crash mid-processing/,
  )

  assert.equal(operations.stopCalls, 1)
  assert.equal(operations.removeObjectsCalls.length, 1)
  assert.deepEqual(operations.removeObjectsCalls[0], meta)
  assert.equal(store.getActive(), undefined)

  // 2: DO reconstruction/restart with abandoned active job
  const store2 = new InMemoryImageJobStore()
  const operations2 = new TestImageJobOperations()
  const abandonedJob: ImageJob = {
    metadata: meta,
    attemptId: 'abandoned-attempt-id',
    stage: 'processing',
    pending: {},
    written: {},
    retries: 0,
  }
  store2.putActive(abandonedJob)

  const reconstructedCoordinator = new TestImageJobCoordinator(
    store2,
    operations2,
  )
  await reconstructedCoordinator.alarm()

  assert.equal(operations2.stopCalls, 1)
  assert.equal(operations2.removeObjectsCalls.length, 1)
  assert.equal(store2.getActive(), undefined)
  assert.equal(operations2.alarms.at(-1), null)
})

test('late R2 write acknowledgement fencing before deletion', async () => {
  const store = new InMemoryImageJobStore()
  const operations = new TestImageJobOperations()
  const coordinator = new TestImageJobCoordinator(store, operations)
  const meta = fixtureMetadata()

  let pendingToken = ''
  let activeAttemptId = ''

  operations.processFn = async (job) => {
    activeAttemptId = job.attemptId
    pendingToken = coordinator.beginWrite(
      job.attemptId,
      meta.objectKeys.original,
      meta.filesize,
      meta.mimeType,
    )
    throw new Error('Process interrupted with write in flight')
  }

  const signal = new AbortController().signal
  await assert.rejects(
    coordinator.run(meta, dummyBody(), signal),
    (err: unknown) => {
      assert.ok(err instanceof ImageProcessingError)
      assert.equal(err.code, 'PROCESSOR_BUSY')
      assert.match(err.message, /finishing its storage cleanup/)
      return true
    },
  )

  // In recovery, saw pending write > 0; removeObjects was NOT called
  assert.equal(operations.removeObjectsCalls.length, 0)
  const active = store.getActive()!
  assert.equal(active.stage, 'cleanup')
  assert.ok(active.pending[meta.objectKeys.original])

  // Late beginWrite while in 'cleanup' stage is rejected (fenced)
  assert.throws(
    () =>
      coordinator.beginWrite(
        activeAttemptId,
        meta.objectKeys.variants.thumbnail,
        1000,
        'image/webp',
      ),
    (err: unknown) =>
      err instanceof ImageProcessingError && err.code === 'FORBIDDEN',
  )

  // Late write finishes and clears pending
  coordinator.finishWrite(
    activeAttemptId,
    meta.objectKeys.original,
    pendingToken,
    true,
  )
  assert.equal(Object.keys(store.getActive()!.pending).length, 0)

  // Next recovery attempt safely deletes objects
  await coordinator.alarm()
  assert.equal(operations.removeObjectsCalls.length, 1)
  assert.equal(store.getActive(), undefined)
})

test('persisting recovery and ambiguous D1 success never deleting objects', async () => {
  // 1: ambiguous D1 failure during run recovery
  const store = new InMemoryImageJobStore()
  const operations = new TestImageJobOperations()
  const coordinator = new TestImageJobCoordinator(store, operations)
  const meta = fixtureMetadata()
  const res = fixtureResult(meta)
  const committed = resultToUploadResponse(res, 99, publicBase)

  operations.processFn = async (job) => {
    writeAllReceipts(coordinator, job.attemptId, meta)
    return res
  }
  operations.persistFn = async () => {
    operations.committedResponses.set(meta.uploadId, committed)
    throw new Error('D1 network dropped')
  }

  const signal = new AbortController().signal
  const response = await coordinator.run(meta, dummyBody(), signal)

  assert.equal(response.mediaId, 99)
  assert.equal(operations.removeObjectsCalls.length, 0)
  assert.equal(store.getActive(), undefined)
  assert.deepEqual(store.getCompleted(meta.uploadId)?.response, committed)

  // 2: DO restarted in 'persisting' stage
  const store2 = new InMemoryImageJobStore()
  const operations2 = new TestImageJobOperations()
  const persistingJob: ImageJob = {
    metadata: meta,
    attemptId: 'persisting-attempt',
    stage: 'persisting',
    pending: {},
    written: {},
    result: res,
    retries: 0,
  }
  store2.putActive(persistingJob)
  operations2.committedResponses.set(meta.uploadId, committed)

  const coordinator2 = new TestImageJobCoordinator(store2, operations2)
  await coordinator2.alarm()

  assert.equal(operations2.removeObjectsCalls.length, 0)
  assert.equal(store2.getActive(), undefined)
  assert.deepEqual(store2.getCompleted(meta.uploadId)?.response, committed)
})

test('cleanup failure retries and alarm fence', async () => {
  const store = new InMemoryImageJobStore()
  const operations = new TestImageJobOperations()
  const coordinator = new TestImageJobCoordinator(store, operations)
  const meta = fixtureMetadata()

  operations.removeObjectsFn = async () => {
    throw new Error('R2 delete network timeout')
  }

  const abandonedJob: ImageJob = {
    metadata: meta,
    attemptId: 'abandoned-attempt',
    stage: 'processing',
    pending: {},
    written: {},
    retries: 0,
  }
  store.putActive(abandonedJob)

  // Alarm triggers recovery, which attempts removeObjects and fails
  await coordinator.alarm()

  // Active job remains fenced in store with incremented retries
  const active = store.getActive()!
  assert.equal(active.retries, 1)
  assert.equal(operations.reports.length, 1)
  assert.ok(operations.alarms.length > 0)
  assert.notEqual(operations.alarms.at(-1), null)

  // Alarm fence when coordinator is running
  let resolveProcess: () => void
  const runningPromise = new Promise<void>((resolve) => {
    resolveProcess = resolve
  })
  operations.processFn = async () => {
    await runningPromise
    throw new Error('Abort process')
  }

  store.clearActive()
  const activeRun = coordinator.run(
    meta,
    dummyBody(),
    new AbortController().signal,
  )

  const alarmCountBefore = operations.alarms.length
  await coordinator.alarm()
  assert.ok(operations.alarms.length > alarmCountBefore)

  resolveProcess!()
  await assert.rejects(activeRun)
})

test('variant receipt metadata mismatch rejects with STORAGE_FAILED', async () => {
  const store = new InMemoryImageJobStore()
  const operations = new TestImageJobOperations()
  const coordinator = new TestImageJobCoordinator(store, operations)
  const meta = fixtureMetadata()
  const res = fixtureResult(meta)

  operations.processFn = async (job) => {
    const origToken = coordinator.beginWrite(
      job.attemptId,
      meta.objectKeys.original,
      meta.filesize,
      meta.mimeType,
    )
    coordinator.finishWrite(
      job.attemptId,
      meta.objectKeys.original,
      origToken,
      true,
    )

    for (const id of VARIANT_IDS) {
      const key = meta.objectKeys.variants[id]
      const size = id === 'thumbnail' ? 999 : 1000
      const token = coordinator.beginWrite(
        job.attemptId,
        key,
        size,
        'image/webp',
      )
      coordinator.finishWrite(job.attemptId, key, token, true)
    }
    return res
  }

  const signal = new AbortController().signal
  await assert.rejects(
    coordinator.run(meta, dummyBody(), signal),
    (err: unknown) => {
      assert.ok(err instanceof ImageProcessingError)
      assert.equal(err.code, 'STORAGE_FAILED')
      assert.match(err.message, /does not match its completed object writes/)
      return true
    },
  )
  assert.equal(operations.removeObjectsCalls.length, 1)
  assert.equal(store.getActive(), undefined)
})

test('persisting stage recovery without prior commit commits directly without deleting', async () => {
  const store = new InMemoryImageJobStore()
  const operations = new TestImageJobOperations()
  const meta = fixtureMetadata()
  const res = fixtureResult(meta)

  const persistingJob: ImageJob = {
    metadata: meta,
    attemptId: 'persisting-attempt-2',
    stage: 'persisting',
    pending: {},
    written: {},
    result: res,
    retries: 0,
  }
  store.putActive(persistingJob)

  const coordinator = new TestImageJobCoordinator(store, operations)
  await coordinator.alarm()

  assert.equal(operations.persistCalls.length, 1)
  assert.equal(operations.removeObjectsCalls.length, 0)
  assert.equal(store.getActive(), undefined)
  assert.equal(
    store.getCompleted(meta.uploadId)?.response.uploadId,
    meta.uploadId,
  )
})

test('cleanup failure retries cap at 8 and clear alarm on 9th retry', async () => {
  const store = new InMemoryImageJobStore()
  const operations = new TestImageJobOperations()
  const coordinator = new TestImageJobCoordinator(store, operations)
  const meta = fixtureMetadata()

  operations.removeObjectsFn = async () => {
    throw new Error('R2 delete network timeout')
  }

  const abandonedJob: ImageJob = {
    metadata: meta,
    attemptId: 'abandoned-attempt-cap',
    stage: 'cleanup',
    pending: {},
    written: {},
    retries: 8,
  }
  store.putActive(abandonedJob)

  // 9th retry (retries becomes 9 > 8)
  await coordinator.alarm()

  const active = store.getActive()!
  assert.equal(active.retries, 9)
  assert.equal(operations.alarms.at(-1), null)
})
