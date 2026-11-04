import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { media } from 'shared'
import type {
  ProcessImageResult,
  UploadImageResponse,
} from 'shared/image-processing'
import type { IMediaRepository } from '../domain/ports/media-repository.port'
import { MediaRecordMapper } from './media-record.mapper'

export class D1MediaRepository implements IMediaRepository {
  private static readonly instances = new WeakMap<
    D1Database,
    Map<string, D1MediaRepository>
  >()

  private readonly db: DrizzleD1Database
  private readonly mapper: MediaRecordMapper

  public constructor(
    binding: D1Database,
    publicBase: string,
    mapper: MediaRecordMapper = MediaRecordMapper.getInstance(publicBase),
  ) {
    this.db = drizzle(binding)
    this.mapper = mapper
  }

  public static getInstance(
    binding: D1Database,
    publicBase: string,
  ): D1MediaRepository {
    let byBase = D1MediaRepository.instances.get(binding)
    if (!byBase) {
      byBase = new Map<string, D1MediaRepository>()
      D1MediaRepository.instances.set(binding, byBase)
    }
    let instance = byBase.get(publicBase)
    if (!instance) {
      instance = new D1MediaRepository(
        binding,
        publicBase,
        MediaRecordMapper.getInstance(publicBase),
      )
      byBase.set(publicBase, instance)
    }
    return instance
  }

  public async findByOriginalFilename(
    filename: string,
    uploadId: string,
  ): Promise<UploadImageResponse | null> {
    const row = await this.db
      .select()
      .from(media)
      .where(eq(media.filename, filename))
      .get()
    return row ? this.mapper.fromRowToUploadResponse(row, uploadId) : null
  }

  public async persist(
    result: ProcessImageResult,
  ): Promise<UploadImageResponse> {
    const values = this.mapper.toInsertValues(result)
    // Never replace a committed row: a retry recovers by the unique original filename.
    const inserted = (await this.db
      .insert(media)
      .values(values)
      .onConflictDoNothing({ target: media.filename })
      .returning({ id: media.id })
      .get()) as { id: number } | undefined

    if (inserted) {
      return this.mapper.toUploadResponse(result, inserted.id)
    }

    const existing = await this.findByOriginalFilename(
      result.original.filename,
      result.uploadId,
    )
    if (!existing) {
      throw new Error('Media commit could not be recovered')
    }
    return existing
  }
}
