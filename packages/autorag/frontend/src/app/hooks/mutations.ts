import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { handleRestFailures, isModArchResponse, restCREATE } from 'mod-arch-core';
import * as z from 'zod';
import {
  uploadFileToS3,
  type UploadFileToS3Params,
  type UploadFileToS3Response,
} from '~/app/api/s3';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { PipelineRun } from '~/app/types';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

export type S3FileUploadMutationVariables = UploadFileToS3Params & {
  file: File;
};

/**
 * React Query mutation for uploading a file to S3 via POST /api/v1/s3/files/:key.
 * Uses hostPath '' for same-origin requests by default.
 */
export function useS3FileUploadMutation(
  hostPath = '',
): UseMutationResult<UploadFileToS3Response, Error, S3FileUploadMutationVariables> {
  return useMutation({
    mutationKey: ['autorag', 's3FileUpload'],
    mutationFn: async (variables: S3FileUploadMutationVariables) => {
      const { file, ...params } = variables;
      return uploadFileToS3(hostPath, params, file);
    },
  });
}

async function postPipelineRunAction(url: string, action: string): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const body = await response.text();
    let serverMessage = body;
    try {
      const json = JSON.parse(body);
      serverMessage = json.error?.message || json.message || body;
    } catch {
      // body is not JSON, use as-is
    }
    throw new Error(`Failed to ${action} run (${response.status}): ${serverMessage}`);
  }
}

export function useTerminatePipelineRunMutation(
  namespace: string,
  runId: string,
): UseMutationResult<void, Error, void, unknown> {
  return useMutation({
    mutationKey: ['autorag', 'terminatePipelineRun', runId],
    mutationFn: () => {
      const url = `${URL_PREFIX}/api/${BFF_API_VERSION}/pipeline-runs/${encodeURIComponent(
        runId,
      )}/terminate?namespace=${encodeURIComponent(namespace)}`;
      return postPipelineRunAction(url, 'terminate');
    },
  });
}

export function useRetryPipelineRunMutation(
  namespace: string,
  runId: string,
): UseMutationResult<void, Error, void, unknown> {
  return useMutation({
    mutationKey: ['autorag', 'retryPipelineRun', runId],
    mutationFn: () => {
      const url = `${URL_PREFIX}/api/${BFF_API_VERSION}/pipeline-runs/${encodeURIComponent(
        runId,
      )}/retry?namespace=${encodeURIComponent(namespace)}`;
      return postPipelineRunAction(url, 'retry');
    },
  });
}

export function useDeletePipelineRunMutation(
  namespace: string,
  runId: string,
): UseMutationResult<void, Error, void, unknown> {
  return useMutation({
    mutationKey: ['autorag', 'deletePipelineRun', runId],
    mutationFn: async () => {
      const url = `${URL_PREFIX}/api/${BFF_API_VERSION}/pipeline-runs/${encodeURIComponent(
        runId,
      )}?namespace=${encodeURIComponent(namespace)}`;
      const response = await fetch(url, { method: 'DELETE' });
      if (!response.ok) {
        const body = await response.text();
        let serverMessage = body;
        try {
          const json = JSON.parse(body);
          serverMessage = json.error?.message || json.message || body;
        } catch {
          // body is not JSON, use as-is
        }
        throw new Error(`Failed to delete run (${response.status}): ${serverMessage}`);
      }
    },
  });
}

export function useCreatePipelineRunMutation(
  namespace: string,
): UseMutationResult<PipelineRun, Error, ConfigureSchema, unknown> {
  return useMutation({
    mutationKey: ['autorag', 'pipelineRun'],
    mutationFn: async (payload: ConfigureSchema) => {
      const response = await handleRestFailures(
        restCREATE<PipelineRun>(
          '',
          `${URL_PREFIX}/api/${BFF_API_VERSION}/pipeline-runs?namespace=${namespace}`,
          payload,
        ),
      );
      if (isModArchResponse<PipelineRun>(response)) {
        return z
          .object({
            /* eslint-disable camelcase */
            run_id: z.string(),
            display_name: z.string(),
            created_at: z.string(),
            state: z.string(),
            experiment_id: z.string().optional(),
            storage_state: z.string().optional(),
            description: z.string().optional(),
            pipeline_version_id: z.string().optional(),
            service_account: z.string().optional(),
            scheduled_at: z.string().optional(),
            finished_at: z.string().optional(),
            /* eslint-enable camelcase */
          })
          .parse(response.data);
      }
      throw new Error('Invalid response format');
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
