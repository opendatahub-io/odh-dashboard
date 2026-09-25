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
export { useSecretsQuery, createSecretsQueryOptions, secretsQueryKey } from './k8s/useSecretsQuery';
export { useCreateSecretMutation } from './k8s/useCreateSecretMutation';

export { usePipelineRuns, type PipelineRunsResult } from './pipelines/usePipelineRuns';
export { usePipelineRunQuery } from './pipelines/usePipelineRunQuery';
export { useCreatePipelineRunMutation } from './pipelines/useCreatePipelineRunMutation';
export { useTerminatePipelineRunMutation } from './pipelines/useTerminatePipelineRunMutation';
export { useRetryPipelineRunMutation } from './pipelines/useRetryPipelineRunMutation';
export { useDeletePipelineRunMutation } from './pipelines/useDeletePipelineRunMutation';
export {
  usePipelineServerReadinessQuery,
  pipelineServerReadinessKey,
} from './pipelines/usePipelineServerReadinessQuery';
export { useEnableManagedPipelinesMutation } from './pipelines/useEnableManagedPipelinesMutation';

export { useS3FileFetchers } from './s3/useS3FileFetchers';
export { useFetchS3File } from './s3/useFetchS3File';
export {
  getS3JsonQueryKey,
  type FetchS3FileOptions,
  type FetchS3JsonOptions,
  type S3FileFetchers,
} from '../api/s3';
export { useS3ListFilesQuery, createS3ListFilesQueryOptions } from './s3/useS3ListFilesQuery';
export {
  useS3FileUploadMutation,
  type S3FileUploadMutationVariables,
} from './s3/useS3FileUploadMutation';
