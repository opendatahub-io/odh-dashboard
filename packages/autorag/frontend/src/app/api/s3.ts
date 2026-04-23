// Modules -------------------------------------------------------------------->

import * as z from 'zod';
import {
  APIOptions,
  handleRestFailures,
  isModArchResponse,
  restCREATE,
  restGET,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import type { S3ListObjectsResponse } from '~/app/types';

// Globals -------------------------------------------------------------------->

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

// Types ---------------------------------------------------------------------->

export type UploadFileToS3Params = {
  namespace: string;
  secretName: string;
  bucket?: string;
  key: string;
};

export type UploadFileToS3Response = {
  uploaded: boolean;
  key: string;
};

export type GetFilesOptions = {
  namespace: string;
  secretName?: string;
  bucket?: string;
  path?: string;
  search?: string;
  limit?: number;
  next?: string;
};

// Public --------------------------------------------------------------------->

/**
 * Uploads a file to S3 via the BFF POST /api/v1/s3/files/:key endpoint.
 * Uses the given secret for credentials and the file's key (path) in the bucket.
 *
 * @param hostPath - Base path for API requests (e.g. '' for same-origin)
 * @param params - namespace, secretName, key (required); bucket (optional, uses secret default if omitted)
 * @param file - The file to upload (sent as multipart form field "file")
 * @returns Promise that resolves when upload succeeds; throws on non-2xx response or malformed 2xx body
 */
export async function uploadFileToS3(
  hostPath: string,
  params: UploadFileToS3Params,
  file: File,
): Promise<UploadFileToS3Response> {
  if (!params.key || !params.key.trim()) {
    throw new Error('Upload key must be a non-empty string');
  }

  const queryParams: Record<string, string> = {
    namespace: params.namespace,
    secretName: params.secretName,
  };
  if (params.bucket !== undefined && params.bucket !== '') {
    queryParams.bucket = params.bucket;
  }

  const formData = new FormData();
  formData.append('file', file, file.name);

  const path = `${URL_PREFIX}/api/${BFF_API_VERSION}/s3/files/${encodeURIComponent(params.key)}`;

  const response = await handleRestFailures(restCREATE(hostPath, path, formData, queryParams));

  if (!isS3UploadSuccessPayload(response)) {
    throw new Error(
      'Invalid upload response: expected uploaded: true and a non-empty key from server',
    );
  }
  return response;
}

/**
 * getFiles: Fetch files from the S3 BFF endpoint `GET /api/v1/s3/files`
 *
 * @param {string} host - Passed into mod-arch-core's restGET. For typical BFF calls, passed in as ''
 * @param {APIOptions} requestOptions - Passed into mod-arch-core's restGET. Allows the request behaviour to be configured
 * @param {GetFilesOptions} options - Request parameters for S3 get files endpoint
 */
export async function getFiles(
  host: string,
  requestOptions: APIOptions,
  options: GetFilesOptions,
): Promise<S3ListObjectsResponse> {
  const query: Record<string, string> = {
    namespace: options.namespace,
  };

  if (options.secretName) {
    query.secretName = options.secretName;
  }
  if (options.bucket) {
    query.bucket = options.bucket;
  }
  if (options.path) {
    query.path = options.path;
  }
  if (options.search) {
    query.search = options.search;
  }
  if (options.limit !== undefined) {
    query.limit = String(options.limit);
  }
  if (options.next) {
    query.next = options.next;
  }

  const response = await handleRestFailures(
    restGET(host, `${URL_PREFIX}/api/${BFF_API_VERSION}/s3/files`, query, requestOptions),
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
}

// Private -------------------------------------------------------------------->

function isS3UploadSuccessPayload(data: unknown): data is UploadFileToS3Response {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  return (
    'uploaded' in data &&
    data.uploaded === true &&
    'key' in data &&
    typeof data.key === 'string' &&
    data.key.trim() !== ''
  );
}
