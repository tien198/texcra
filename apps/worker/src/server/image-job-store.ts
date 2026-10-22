import type {
  CompletedImageJob,
  ImageJob,
  ImageJobStore,
} from './image-job-types'

export class SqliteImageJobStore implements ImageJobStore {
  constructor(private readonly sql: SqlStorage) {
    sql.exec(
      'CREATE TABLE IF NOT EXISTS image_jobs (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
    )
  }

  private read<T>(key: string): T | undefined {
    const row = this.sql
      .exec<{ value: string }>(
        'SELECT value FROM image_jobs WHERE key = ?',
        key,
      )
      .toArray()
      .at(0)
    return row ? (JSON.parse(row.value) as T) : undefined
  }

  private write(key: string, value: ImageJob | CompletedImageJob): void {
    this.sql.exec(
      'INSERT INTO image_jobs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key,
      JSON.stringify(value),
    )
  }

  getActive(): ImageJob | undefined {
    return this.read<ImageJob>('active')
  }
  putActive(job: ImageJob): void {
    this.write('active', job)
  }
  clearActive(): void {
    this.sql.exec('DELETE FROM image_jobs WHERE key = ?', 'active')
  }
  getCompleted(id: string): CompletedImageJob | undefined {
    return this.read<CompletedImageJob>(`completed:${id}`)
  }
  putCompleted(id: string, completed: CompletedImageJob): void {
    this.write(`completed:${id}`, completed)
  }
}
