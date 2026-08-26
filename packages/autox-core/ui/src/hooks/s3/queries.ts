import * as z from 'zod';

export type FetchS3FileOptions = {
  secretName?: string;
  bucket?: string;
  signal?: AbortSignal;
  maxBytes?: number;
};

export type FetchS3JsonOptions<T> = {
  signal?: AbortSignal;
  schema?: z.ZodSchema<T>;
  maxBytes?: number;
};

export type S3FileFetchers = {
  /**
   * Fetches a file from S3 storage and returns it as a Blob.
   * This is a utility function that can be used in both hooks and query functions.
   */
  fetchS3File: (namespace: string, key: string, options?: FetchS3FileOptions) => Promise<Blob>;
  /**
   * Fetches and parses JSON content from S3.
   *
   * @param namespace - K8s namespace
   * @param key - S3 object key
   * @param options - Optional configuration
   * @param options.signal - Abort signal for cancellation
   * @param options.schema - Optional Zod schema for runtime validation
   * @returns Parsed JSON cast to type T (validated if schema provided)
   */
  fetchS3Json: <T>(namespace: string, key: string, options?: FetchS3JsonOptions<T>) => Promise<T>;
};

const DEFAULT_MAX_JSON_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Creates `fetchS3File`/`fetchS3Json` helpers bound to a product's BFF URL prefix.
 *
 * Note: unlike `createS3Api`'s `getFiles`/`uploadFileToS3`, these hit the BFF's
 * `/api/v1/s3/files/:key` endpoint directly via `fetch` (not through
 * `mod-arch-core`'s rest helpers) and always use the literal `v1` API segment,
 * matching both products' existing implementation exactly.
 */
export function createS3FileFetchers(urlPrefix: string): S3FileFetchers {
  async function fetchS3File(
    namespace: string,
    key: string,
    options?: FetchS3FileOptions,
  ): Promise<Blob> {
    if (!key || !key.trim()) {
      throw new Error('File key must be a non-empty string');
    }

    const { secretName, bucket, signal, maxBytes } = options ?? {};
    const params = new URLSearchParams({
      namespace,
      ...(secretName && { secretName }),
      ...(bucket && { bucket }),
    });

    const abortController = maxBytes != null ? new AbortController() : undefined;
    const combinedSignal = abortController
      ? AbortSignal.any([abortController.signal, ...(signal ? [signal] : [])])
      : signal;

    const response = await fetch(
      `${urlPrefix}/api/v1/s3/files/${encodeURIComponent(key)}?${params.toString()}`,
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
    const { signal, schema, maxBytes = DEFAULT_MAX_JSON_BYTES } = options ?? {};
    const blob = await fetchS3File(namespace, key, { signal, maxBytes });
    const text = await blob.text();

    try {
      const parsed = JSON.parse(text);

      // Validate if schema provided, otherwise trust the data
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

  return { fetchS3File, fetchS3Json };
}
