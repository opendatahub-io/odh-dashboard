import { useMutation, UseMutationResult } from '@tanstack/react-query';
import type { S3Api, UploadFileToS3Params, UploadFileToS3Response } from '../../api/s3';

export type S3FileUploadMutationVariables = UploadFileToS3Params & {
  file: File;
};

/**
 * Creates a `useS3FileUploadMutation` hook bound to a product's own
 * `uploadFileToS3` API function (as returned by `createS3Api`).
 */
export function createUseS3FileUploadMutation(
  uploadFileToS3: S3Api['uploadFileToS3'],
): (
  hostPath?: string,
) => UseMutationResult<UploadFileToS3Response, Error, S3FileUploadMutationVariables> {
  /**
   * React Query mutation for uploading a file to S3 via POST /api/v1/s3/files/:key.
   * Uses hostPath '' for same-origin requests by default.
   */
  return function useS3FileUploadMutation(
    hostPath = '',
  ): UseMutationResult<UploadFileToS3Response, Error, S3FileUploadMutationVariables> {
    return useMutation({
      mutationKey: ['s3FileUpload'],
      mutationFn: async (variables: S3FileUploadMutationVariables) => {
        const { file, ...params } = variables;
        return uploadFileToS3(hostPath, params, file);
      },
    });
  };
}
