import * as z from 'zod';
import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { S3ListObjectsResponse } from '~/app/types';

/**
 * Zod schema to validate S3ListObjectsResponse shape
 */
/* eslint-disable camelcase */
const S3ListObjectsResponseSchema = z.object({
  common_prefixes: z.array(
    z.object({
      prefix: z.string(),
    }),
  ),
  contents: z.array(
    z.object({
      key: z.string(),
      size: z.number(),
      last_modified: z.string().optional(),
      etag: z.string().optional(),
      storage_class: z.string().optional(),
    }),
  ),
  is_truncated: z.boolean(),
  key_count: z.number(),
  max_keys: z.number(),
  continuation_token: z.string().optional(),
  delimiter: z.string().optional(),
  name: z.string().optional(),
  next_continuation_token: z.string().optional(),
  prefix: z.string().optional(),
});
/* eslint-enable camelcase */

export const getFiles =
  (hostPath: string) =>
  (
    namespace: string,
    secretName?: string,
    bucket?: string,
    options?: { path?: string; search?: string; limit?: number; next?: string },
  ) =>
  async (opts: APIOptions): Promise<S3ListObjectsResponse> => {
    const queryParams: Record<string, string> = {
      namespace,
    };

    if (secretName) {
      queryParams.secretName = secretName;
    }
    if (bucket) {
      queryParams.bucket = bucket;
    }
    if (options?.path) {
      queryParams.path = options.path;
    }
    if (options?.search) {
      queryParams.search = options.search;
    }
    if (options?.limit !== undefined) {
      queryParams.limit = String(options.limit);
    }
    if (options?.next) {
      queryParams.next = options.next;
    }

    const response = await handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/s3/files`, queryParams, opts),
    );
    if (isModArchResponse<S3ListObjectsResponse>(response)) {
      try {
        return S3ListObjectsResponseSchema.parse(response.data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const issues = error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join(', ');
          throw new Error(`Invalid S3ListObjectsResponse: ${issues}`);
        }
        throw error;
      }
    }
    throw new Error('Invalid response format');
  };
