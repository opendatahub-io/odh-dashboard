import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { S3ListObjectsResult } from '~/app/types';

export const getFiles =
  (hostPath: string) =>
  (namespace: string, secretName: string, bucket: string) =>
  (opts: APIOptions): Promise<S3ListObjectsResult> => {
    const queryParams: Record<string, string> = {
      namespace,
      secretName,
      bucket,
    };
    return handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/s3/files`, queryParams, opts),
    ).then((response) => {
      if (isModArchResponse<S3ListObjectsResult>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
  };
