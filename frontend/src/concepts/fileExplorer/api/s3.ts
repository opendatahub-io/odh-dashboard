// Modules -------------------------------------------------------------------->

import * as z from 'zod';
import {
  S3ListObjectsResponseSchema,
  type S3ListObjectsResponse,
} from '#~/concepts/fileExplorer/types.ts';

// Types ---------------------------------------------------------------------->

export type RequestOptions = {
  signal?: AbortSignal;
};

export type GetFilesOptions = {
  apiPath: string; // Example: `/autorag/api/v1/s3` or `/automl/api/v1/s3`
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
 * getFiles: Fetch files from the S3 BFF endpoint `GET {apiPath}/files`
 *
 * @param {string} host - Base path for API requests (e.g. '' for same-origin)
 * @param {RequestOptions} requestOptions - Allows the request behaviour to be configured (e.g. abort signal)
 * @param {GetFilesOptions} options - Request parameters for S3 get files endpoint
 */
export async function getFiles(
  host: string,
  requestOptions: RequestOptions,
  options: GetFilesOptions,
): Promise<S3ListObjectsResponse> {
  const query = new URLSearchParams({ namespace: options.namespace });

  if (options.secretName) {
    query.set('secretName', options.secretName);
  }
  if (options.bucket) {
    query.set('bucket', options.bucket);
  }
  if (options.path) {
    query.set('path', options.path);
  }
  if (options.search) {
    query.set('search', options.search);
  }
  if (options.limit !== undefined) {
    query.set('limit', String(options.limit));
  }
  if (options.next) {
    query.set('next', options.next);
  }

  assertSafeApiPath(options.apiPath);

  const url = new URL(`${host}${options.apiPath}/files`, window.location.origin);
  url.search = query.toString();

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    ...(requestOptions.signal && { signal: requestOptions.signal }),
  });
  await throwIfNotOk(response);

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new Error('Server returned a non-JSON response');
  }

  // The BFF wraps responses in { data: <payload> }
  const payload = hasDataProperty(json) ? json.data : json;

  try {
    return S3ListObjectsResponseSchema.parse(payload);
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

// Private -------------------------------------------------------------------->

function assertSafeApiPath(apiPath: string): void {
  if (
    !apiPath.startsWith('/') ||
    apiPath.startsWith('//') ||
    apiPath.includes('..') ||
    /^[a-z]+:/i.test(apiPath)
  ) {
    throw new Error(
      `Unsafe apiPath: "${apiPath}" — must be an absolute path with no traversal or protocol`,
    );
  }
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch {
      detail = '(response body unreadable)';
    }
    throw new Error(`Request failed (${response.status}): ${detail || response.statusText}`);
  }
}

function hasDataProperty(value: unknown): value is { data: unknown } {
  return typeof value === 'object' && value !== null && 'data' in value;
}
