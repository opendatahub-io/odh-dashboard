import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { handleRestFailures, isModArchResponse, restCREATE } from 'mod-arch-core';
import * as z from 'zod';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { PipelineRun } from '~/app/types';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

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

async function uploadFileWithStream(
  url: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<unknown> {
  const fileSize = file.size;
  let bytesWritten = 0;

  const progressTransform = new TransformStream({
    transform: (chunk, controller) => {
      bytesWritten += chunk.byteLength;
      if (onProgress) {
        const progress = (bytesWritten / fileSize) * 100;
        onProgress(progress);
      }
      controller.enqueue(chunk);
    },
  });

  const body = file.stream().pipeThrough(progressTransform);

  const response = await fetch(url, {
    method: 'POST',
    body,
    // @ts-expect-error duplex is not in the TypeScript definitions yet
    duplex: 'half',
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  return response.json();
}

function uploadFileWithXHR(
  url: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          resolve(xhr.responseText);
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.open('POST', url);
    xhr.send(file);
  });
}

export function useUploadToStorageMutation(
  namespace: string,
): UseMutationResult<
  unknown,
  Error,
  { file: File; onProgress?: (progress: number) => void },
  unknown
> {
  return useMutation({
    mutationKey: ['autorag', 'storage'],
    mutationFn: async (options: { file: File; onProgress?: (progress: number) => void }) => {
      const url = `${URL_PREFIX}/api/${BFF_API_VERSION}/test-upload?namespace=${namespace}`;
      // const url = `${URL_PREFIX}/api/${BFF_API_VERSION}/s3/file?namespace=${namespace}`;

      try {
        return await uploadFileWithStream(url, options.file, options.onProgress);
      } catch {
        // eslint-disable-next-line no-console
        console.info('Failed to stream request; falling back to XHR');
        return uploadFileWithXHR(url, options.file, options.onProgress);
      }
    },
  });
}
