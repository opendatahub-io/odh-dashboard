import { handleRestFailures, restCREATE } from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

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

/**
 * Uploads a file to S3 via the BFF POST /api/v1/s3/file endpoint.
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
  const queryParams: Record<string, string> = {
    namespace: params.namespace,
    secretName: params.secretName,
    key: params.key,
  };
  if (params.bucket !== undefined && params.bucket !== '') {
    queryParams.bucket = params.bucket;
  }

  const formData = new FormData();
  formData.append('file', file, file.name);

  const path = `${URL_PREFIX}/api/${BFF_API_VERSION}/s3/file`;

  const response = await handleRestFailures(restCREATE(hostPath, path, formData, queryParams));

  if (!isS3UploadSuccessPayload(response)) {
    throw new Error(
      'Invalid upload response: expected uploaded: true and a non-empty key from server',
    );
  }
  return response;
}

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
