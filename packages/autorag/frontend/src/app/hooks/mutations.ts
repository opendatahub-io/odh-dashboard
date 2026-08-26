import { useMutation, UseMutationResult } from '@tanstack/react-query';
import {
  useTerminatePipelineRunMutation,
  useRetryPipelineRunMutation,
  useDeletePipelineRunMutation,
  useS3FileUploadMutation,
  type S3FileUploadMutationVariables,
} from '@odh-dashboard/autox-core/ui/hooks';
import { createIndexingPipelineRun, createPipelineRun } from '~/app/api/pipelines';
import { uploadToStorage } from '~/app/api/s3';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { CreateIndexingPipelineRunRequest, PipelineRun } from '~/app/types';

export type { S3FileUploadMutationVariables };

export {
  useS3FileUploadMutation,
  useTerminatePipelineRunMutation,
  useRetryPipelineRunMutation,
  useDeletePipelineRunMutation,
};

export function useCreatePipelineRunMutation(
  namespace: string,
): UseMutationResult<PipelineRun, Error, ConfigureSchema, unknown> {
  return useMutation({
    mutationKey: ['autorag', 'pipelineRun'],
    mutationFn: (payload: ConfigureSchema) => createPipelineRun('', namespace, payload),
  });
}

export function useCreateIndexingPipelineRunMutation(
  namespace: string,
): UseMutationResult<PipelineRun, Error, CreateIndexingPipelineRunRequest, unknown> {
  return useMutation({
    mutationKey: ['autorag', 'indexingPipelineRun', namespace],
    // The API helper validates required fields without stripping the BFF PipelineRun payload.
    mutationFn: (payload: CreateIndexingPipelineRunRequest) =>
      createIndexingPipelineRun('', namespace, payload),
  });
}

export function useUploadToStorageMutation(
  namespace: string,
  secretName: string,
): UseMutationResult<
  { uploaded: boolean; key: string },
  Error,
  { file: File; path?: string; onProgress?: (progress: number) => void },
  unknown
> {
  return useMutation({
    mutationKey: ['autorag', 'storage'],
    mutationFn: ({
      file,
      path = '',
      onProgress,
    }: {
      file: File;
      path?: string;
      onProgress?: (progress: number) => void;
    }) => uploadToStorage(namespace, secretName, file, path, onProgress),
  });
}
