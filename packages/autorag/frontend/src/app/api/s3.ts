import { createS3Api } from '@odh-dashboard/autox-core/ui/api';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

export type {
  UploadFileToS3Params,
  UploadFileToS3Response,
  GetFilesOptions,
} from '@odh-dashboard/autox-core/ui/api';

export const s3Api = createS3Api(URL_PREFIX, BFF_API_VERSION);
export const { uploadFileToS3, getFiles } = s3Api;

export function uploadToStorage(
  namespace: string,
  secretName: string,
  file: File,
  path = '',
  onProgress?: (progress: number) => void,
): Promise<{ uploaded: boolean; key: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const key = (path ? `${path}/` : '') + file.name;

    if (!key.trim()) {
      reject(new Error('Upload key must be a non-empty string'));
      return;
    }
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          onProgress((event.loaded / event.total) * 100);
        }
      });
    }
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (error) {
          reject(new Error(`Failed to parse upload response: ${error}`));
        }
        return;
      }
      try {
        const errorResponse = JSON.parse(xhr.responseText);
        reject(
          new Error(errorResponse?.error?.message || `Upload failed with status ${xhr.status}`),
        );
      } catch {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });
    xhr.addEventListener('error', () => {
      reject(
        new Error('Upload failed due to a network error. Check your connection and try again.'),
      );
    });
    const formData = new FormData();
    formData.append('file', file);
    const params = new URLSearchParams({ namespace, secretName });
    xhr.open(
      'POST',
      `${URL_PREFIX}/api/${BFF_API_VERSION}/s3/files/${encodeURIComponent(key)}?${params.toString()}`,
    );
    xhr.send(formData);
  });
}
