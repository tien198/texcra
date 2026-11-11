import { WorkflowEntrypoint } from 'cloudflare:workers'
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers'
import type { UploadImageResponse } from 'shared/image-processing'
import type { ImageUploadWorkflowParams } from './image-upload.types'
import { executeSagaSteps } from './image-upload.functions'

// Re-export types for backward compatibility
export type {
  ImageUploadWorkflowParams,
  SagaEnvironment,
  WorkflowStepRunner,
} from './image-upload.types'

// Re-export saga orchestration and step helper functions for backward compatibility
export {
  executeSagaSteps,
  verifyR2Objects,
  persistD1Metadata,
  finalizeLeaseAndIdempotency,
  compensateR2AndReleaseLease,
} from './image-upload.functions'

/**
 * Cloudflare Workflow Entrypoint cho quy trình xử lý upload ảnh.
 * Tiếp nhận event và khởi chạy các bước Saga đảm bảo tính nhất quán phân tán.
 */
export class ImageUploadWorkflow extends WorkflowEntrypoint<
  Env,
  ImageUploadWorkflowParams
> {
  override async run(
    event: Readonly<WorkflowEvent<ImageUploadWorkflowParams>>,
    step: WorkflowStep,
  ): Promise<UploadImageResponse> {
    return await executeSagaSteps(this.env, event.payload, step)
  }
}
