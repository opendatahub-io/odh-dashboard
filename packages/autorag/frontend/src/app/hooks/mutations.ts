import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { isModArchResponse, restCREATE } from 'mod-arch-core';
import * as z from 'zod';
import {
  createPipelineRunMutations,
  createUseS3FileUploadMutation,
  type S3FileUploadMutationVariables,
} from '@odh-dashboard/autox-core/ui/hooks';
import { handleRestWithUIErrors } from '@odh-dashboard/autox-core/ui/components/primitive';
import { uploadFileToS3 } from '~/app/api/s3';
import { createIndexingPipelineRun } from '~/app/api/pipelines';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { CreateIndexingPipelineRunRequest, PipelineRun } from '~/app/types';
import { RuntimeStateKF } from '~/app/types/pipeline';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

const createPipelineRunResponseSchema = z.object({
  /* eslint-disable camelcase */
  run_id: z.string(),
  display_name: z.string(),
  created_at: z.string(),
  state: z.enum(RuntimeStateKF).or(z.literal('')),
  experiment_id: z.string().optional(),
  storage_state: z.string().optional(),
  description: z.string().optional(),
  pipeline_version_id: z.string().optional(),
  service_account: z.string().optional(),
  scheduled_at: z.string().optional(),
  finished_at: z.string().optional(),
  /* eslint-enable camelcase */
});

export type { S3FileUploadMutationVariables };

export const useS3FileUploadMutation = createUseS3FileUploadMutation(uploadFileToS3);

export const {
  useTerminatePipelineRunMutation,
  useRetryPipelineRunMutation,
  useDeletePipelineRunMutation,
} = createPipelineRunMutations(URL_PREFIX, BFF_API_VERSION);

export function useCreatePipelineRunMutation(
  namespace: string,
): UseMutationResult<PipelineRun, Error, ConfigureSchema, unknown> {
  return useMutation({
    mutationKey: ['autorag', 'pipelineRun'],
    mutationFn: async (payload: ConfigureSchema) => {
      const response = await handleRestWithUIErrors(
        restCREATE<PipelineRun>(
          '',
          `${URL_PREFIX}/api/${BFF_API_VERSION}/pipeline-runs?namespace=${namespace}`,
          payload,
        ),
      );
      if (isModArchResponse<PipelineRun>(response)) {
        return createPipelineRunResponseSchema.parse(response.data);
      }
      throw new Error('Invalid response format');
    },
  });
}

export function useCreateIndexingPipelineRunMutation(
  namespace: string,
): UseMutationResult<PipelineRun, Error, CreateIndexingPipelineRunRequest, unknown> {
  return useMutation({
    mutationKey: ['autorag', 'indexingPipelineRun', namespace],
    mutationFn: async (payload: CreateIndexingPipelineRunRequest) => {
      const run = await createIndexingPipelineRun('', namespace, payload);
      // Validate required fields (e.g. run_id) without stripping the BFF PipelineRun payload.
      createPipelineRunResponseSchema.parse(run);
      return run;
    },
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
    mutationFn: async ({
      file,
      path = '',
      onProgress,
    }: {
      file: File;
      path?: string;
      onProgress?: (progress: number) => void;
    }) =>
      new Promise((resolve, reject) => {
        // fetch won't work since it doesn't support progress tracking
        const xhr = new XMLHttpRequest();

        if (onProgress) {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = (event.loaded / event.total) * 100;
              onProgress(progress);
            }
          });
        }

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (parseError) {
              reject(new Error(`Failed to parse upload response: ${parseError}`));
            }
          } else {
            // Parse error response from BFF to get the actual error message
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              const errorMessage =
                errorResponse?.error?.message || `Upload failed with status ${xhr.status}`;
              reject(new Error(errorMessage));
            } catch {
              // If parsing fails, use generic error with status code
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(
            new Error('Upload failed due to a network error. Check your connection and try again.'),
          );
        });

        const formData = new FormData();
        formData.append('file', file);

        const key = (path ? `${path}/` : '') + file.name;
        if (!key || !key.trim()) {
          reject(new Error('Upload key must be a non-empty string'));
          return;
        }
        const params = new URLSearchParams({
          namespace,
          secretName,
        });
        xhr.open(
          'POST',
          `${URL_PREFIX}/api/${BFF_API_VERSION}/s3/files/${encodeURIComponent(key)}?${params.toString()}`,
        );
        xhr.send(formData);
      }),
  });
}
