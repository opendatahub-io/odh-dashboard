import { useMutation, UseMutationResult } from '@tanstack/react-query';
import type { UploadFileToS3Params, UploadFileToS3Response } from '../../api/s3';
import { useAutoXApi } from '../../context';

export type S3FileUploadMutationVariables = UploadFileToS3Params & {
  file: File;
};

export function useS3FileUploadMutation(
  hostPath?: string,
): UseMutationResult<UploadFileToS3Response, Error, S3FileUploadMutationVariables> {
  const { s3: s3Api } = useAutoXApi();

  return useMutation({
    mutationKey: ['s3FileUpload'],
    mutationFn: async (variables: S3FileUploadMutationVariables) => {
      const { file, ...params } = variables;
      return s3Api.uploadFileToS3(hostPath ?? '', params, file);
    },
  });
}
