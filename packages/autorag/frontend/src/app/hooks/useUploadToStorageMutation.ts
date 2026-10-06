import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { uploadToStorage } from '~/app/api/s3';

export function useUploadToStorageMutation(
  namespace: string,
  secretName: string,
): UseMutationResult<
  { uploaded: boolean; key: string },
  Error,
  { file: File; path?: string; onProgress?: (progress: number) => void },
  unknown
> {
  return useMutation({
    mutationKey: ['autorag', 'storage'],
    mutationFn: ({
      file,
      path = '',
      onProgress,
    }: {
      file: File;
      path?: string;
      onProgress?: (progress: number) => void;
    }) => uploadToStorage(namespace, secretName, file, path, onProgress),
  });
}
