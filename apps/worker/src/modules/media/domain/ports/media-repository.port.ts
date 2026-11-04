import type {
  ProcessImageResult,
  UploadImageResponse,
} from 'shared/image-processing'

export interface IMediaRepository {
  // eslint-disable-next-line @typescript-eslint/method-signature-style
  persist(result: ProcessImageResult): Promise<UploadImageResponse>
  // eslint-disable-next-line @typescript-eslint/method-signature-style
  findByOriginalFilename(
    filename: string,
    uploadId: string,
  ): Promise<UploadImageResponse | null>
}
