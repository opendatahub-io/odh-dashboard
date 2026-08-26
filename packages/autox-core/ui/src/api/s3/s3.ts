// Modules -------------------------------------------------------------------->

import * as z from 'zod';
import { APIOptions, isModArchResponse, restCREATE, restGET } from 'mod-arch-core';
import type { S3ListObjectsResponse } from './types';
import { handleRestWithUIErrors } from '../../components/primitive';

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

export type FetchS3FileOptions = {
  secretName?: string;
  bucket?: string;
  signal?: AbortSignal;
  maxBytes?: number;
  view?: string;
};

export type FetchS3JsonOptions<T> = {
  secretName?: string;
  bucket?: string;
  view?: string;
  signal?: AbortSignal;
  schema?: z.ZodSchema<T>;
  maxBytes?: number;
};

export type S3FileFetchers = Pick<S3Api, 'fetchS3File' | 'fetchS3Json'>;

export type S3Api = {
  uploadFileToS3: (
    hostPath: string,
    params: UploadFileToS3Params,
    file: File,
  ) => Promise<UploadFileToS3Response>;
  getFiles: (
    host: string,
    requestOptions: APIOptions,
    options: GetFilesOptions,
  ) => Promise<S3ListObjectsResponse>;
  fetchS3File: (namespace: string, key: string, options?: FetchS3FileOptions) => Promise<Blob>;
  fetchS3Json: <T>(namespace: string, key: string, options?: FetchS3JsonOptions<T>) => Promise<T>;
};

const DEFAULT_MAX_JSON_BYTES = 50 * 1024 * 1024;

// Public --------------------------------------------------------------------->

/**
 * Creates the shared S3 API surface (file upload, file listing) for a given
 * product's BFF URL prefix/API version.
 */
export function createS3Api(urlPrefix: string, bffApiVersion: string): S3Api {
  /**
   * Uploads a file to S3 via the BFF POST /api/{bffApiVersion}/s3/files/:key endpoint.
   * Uses the given secret for credentials and the file's key (path) in the bucket.
   *
   * @param hostPath - Base path for API requests (e.g. '' for same-origin)
   * @param params - namespace, secretName, key (required); bucket (optional, uses secret default if omitted)
   * @param file - The file to upload (sent as multipart form field "file")
   * @returns Promise that resolves when upload succeeds; throws on non-2xx response or malformed 2xx body
   */
  async function uploadFileToS3(
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

    const path = `${urlPrefix}/api/${bffApiVersion}/s3/files/${encodeURIComponent(params.key)}`;

    const response = await handleRestWithUIErrors(
      restCREATE(hostPath, path, formData, queryParams),
    );

    if (!isS3UploadSuccessPayload(response)) {
      throw new Error(
        'Invalid upload response: expected uploaded: true and a non-empty key from server',
      );
    }
    return response;
  }

  /**
   * getFiles: Fetch files from the S3 BFF endpoint `GET /api/{bffApiVersion}/s3/files`
   *
   * @param {string} host - Passed into mod-arch-core's restGET. For typical BFF calls, passed in as ''
   * @param {APIOptions} requestOptions - Passed into mod-arch-core's restGET. Allows the request behaviour to be configured
   * @param {GetFilesOptions} options - Request parameters for S3 get files endpoint
   */
  async function getFiles(
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

    const response = await handleRestWithUIErrors(
      restGET(host, `${urlPrefix}/api/${bffApiVersion}/s3/files`, query, requestOptions),
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

  async function fetchS3File(
    namespace: string,
    key: string,
    options?: FetchS3FileOptions,
  ): Promise<Blob> {
    if (!key || !key.trim()) {
      throw new Error('File key must be a non-empty string');
    }

    const { secretName, bucket, view, signal, maxBytes } = options ?? {};
    const params = new URLSearchParams({
      namespace,
      ...(secretName && { secretName }),
      ...(bucket && { bucket }),
      ...(view && { view }),
    });
    const abortController = maxBytes != null ? new AbortController() : undefined;
    const combinedSignal = abortController
      ? AbortSignal.any([abortController.signal, ...(signal ? [signal] : [])])
      : signal;
    const response = await fetch(
      `${urlPrefix}/api/${bffApiVersion}/s3/files/${encodeURIComponent(key)}?${params.toString()}`,
      { signal: combinedSignal },
    );

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        if (errorData?.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // If parsing fails, fall back to statusText
      }
      throw new Error(`Failed to fetch file: ${errorMessage}`);
    }

    if (maxBytes != null) {
      const contentLength = response.headers.get('Content-Length');
      if (contentLength != null && parseInt(contentLength, 10) > maxBytes) {
        abortController?.abort();
        throw new Error(
          `S3 file too large: ${contentLength} bytes exceeds limit of ${maxBytes} bytes`,
        );
      }
      const reader = response.body?.getReader();
      if (!reader) {
        return response.blob();
      }
      const chunks: Uint8Array[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        received += value.byteLength;
        if (received > maxBytes) {
          abortController?.abort();
          throw new Error(`S3 file too large: exceeded limit of ${maxBytes} bytes during download`);
        }
        chunks.push(value);
      }
      const combined = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return new Blob([combined]);
    }
    return response.blob();
  }

  async function fetchS3Json<T>(
    namespace: string,
    key: string,
    options?: FetchS3JsonOptions<T>,
  ): Promise<T> {
    const { signal, schema, maxBytes = DEFAULT_MAX_JSON_BYTES, secretName, bucket } = options ?? {};
    const blob = await fetchS3File(namespace, key, {
      signal,
      maxBytes,
      secretName,
      bucket,
      view: options?.view,
    });
    const text = await blob.text();
    try {
      const parsed = JSON.parse(text);
      if (schema) {
        return schema.parse(parsed);
      }
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- no schema provided, caller accepts risk
      return parsed as T;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ');
        throw new Error(`Invalid JSON structure from S3 file "${key}": ${issues}`);
      }
      throw new Error(
        `Failed to parse JSON from S3 file "${key}": ${
          error instanceof Error ? error.message : 'Invalid JSON'
        }`,
      );
    }
  }

  return { uploadFileToS3, getFiles, fetchS3File, fetchS3Json };
}

export function createS3FileFetchers(urlPrefix: string): S3FileFetchers {
  const { fetchS3File, fetchS3Json } = createS3Api(urlPrefix, 'v1');
  return { fetchS3File, fetchS3Json };
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
