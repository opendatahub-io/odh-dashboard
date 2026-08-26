/**
 * Shared AutoX `hooks` layer.
 *
 * React Query hooks (wrapping the `api/` layer) plus other reusable hooks,
 * grouped by domain folder (e.g. `hooks/k8s/useUser.ts`). `hooks/common/` holds
 * generic, non-domain-specific hooks with no `api/` counterpart.
 *
 * See ../../ARCHITECTURE.md for the full layering conventions.
 */
export {
  useBoundedCaptionHeight,
  getCaptionHeightBounds,
} from './topology/useBoundedCaptionHeight';

export { useReconfigureSafeEffect } from './common/useReconfigureSafeEffect';
export { useNamespaceSelectorWithPersistence } from './common/useNamespaceSelectorWithPersistence';
export { usePreferredNamespaceRedirect } from './common/usePreferredNamespaceRedirect';
export { createUseUser } from './common/useUser';
export {
  createUseNotification,
  type NotificationAction,
  type NotificationFunc,
} from './common/useNotification';

export { createUseNamespaces } from './k8s/useNamespaces';

export { createUsePipelineRuns, type PipelineRunsResult } from './pipelines/usePipelineRuns';
export {
  createUsePipelineRunQuery,
  type PipelineRunQueryDeps,
} from './pipelines/usePipelineRunQuery';
export {
  createPipelineRunMutations,
  type PipelineRunMutations,
} from './pipelines/usePipelineRunMutations';

export {
  createS3FileFetchers,
  type S3FileFetchers,
  type FetchS3FileOptions,
  type FetchS3JsonOptions,
} from './s3/queries';
export { createUseS3ListFilesQuery } from './s3/useS3ListFilesQuery';
export { createUseS3FileUploadMutation, type S3FileUploadMutationVariables } from './s3/mutations';
