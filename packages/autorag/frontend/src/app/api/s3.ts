import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { S3ListObjectsResult } from '~/app/types';

export const getFiles =
  (hostPath: string) =>
  (
    namespace: string,
    secretName: string,
    bucket: string,
    options?: { path?: string; search?: string; limit?: number; next?: string },
  ) =>
  (opts: APIOptions): Promise<S3ListObjectsResult> => {
    const queryParams: Record<string, string> = {
      namespace,
      secretName,
      bucket,
    };
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
    return handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/s3/files`, queryParams, opts),
    ).then((response) => {
      if (isModArchResponse<S3ListObjectsResult>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
  };
