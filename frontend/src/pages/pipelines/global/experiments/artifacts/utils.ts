/** URI related utils source: https://github.com/kubeflow/pipelines/blob/master/frontend/src/lib/Utils.tsx */
import { Artifact } from '~/third_party/mlmd';

export const getArtifactName = (artifact: Artifact.AsObject | undefined): string | undefined =>
  artifact?.name ||
  artifact?.customPropertiesMap.find(([name]) => name === 'display_name')?.[1].stringValue;

export function buildQuery(queriesMap?: { [key: string]: string | number | undefined }): string {
  const queryContent = Object.entries(queriesMap || {})
    .filter((entry): entry is [string, string | number] => entry[1] != null)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  if (!queryContent) {
    return '';
  }
  return `?${queryContent}`;
}

/**
 * Generates a cloud console uri from gs:// uri
 *
 * @param gcsUri Gcs uri that starts with gs://, like gs://bucket/path/file
 * @returns A link user can open to visit cloud console page.
 */
export function generateGcsConsoleUri(uri: string): string {
  const gcsPrefix = 'gs://';
  return `https://console.cloud.google.com/storage/browser/${uri.substring(gcsPrefix.length)}`;
}

/**
 * Generates an HTTPS API URL from minio:// uri
 *
 * @param uri Minio uri that starts with minio://, like minio://ml-pipeline/path/file
 * @returns A URL that leads to the artifact data. Returns undefined when minioUri is not valid.
 */
export function generateMinioArtifactUrl(uri: string, peek?: number): string | undefined {
  const matches = uri.match(/^minio:\/\/([^/]+)\/(.+)$/);

  return matches
    ? `artifacts/minio/${matches[1]}/${matches[2]}${buildQuery({
        peek,
      })}`
    : undefined;
}

/**
 * Generates an HTTPS API URL from s3:// uri
 *
 * @param uri S3 uri that starts with s3://, like s3://ml-pipeline/path/file
 * @returns A URL that leads to the artifact data. Returns undefined when s3Uri is not valid.
 */
export function generateS3ArtifactUrl(uri: string): string | undefined {
  const matches = uri.match(/^s3:\/\/([^/]+)\/(.+)$/);
  return matches ? `artifacts/s3/${matches[1]}/${matches[2]}${buildQuery()}` : undefined;
}
