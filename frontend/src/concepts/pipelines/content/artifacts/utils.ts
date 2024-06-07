export function extractS3UriComponents(uri: string): { bucket: string; path: string } | undefined {
  const s3Prefix = 's3://';
  if (!uri.startsWith(s3Prefix)) {
    return;
  }

  const s3UrlWithoutPrefix = uri.slice(s3Prefix.length);
  const firstSlashIndex = s3UrlWithoutPrefix.indexOf('/');
  const bucket = s3UrlWithoutPrefix.substring(0, firstSlashIndex);
  const path = s3UrlWithoutPrefix.substring(firstSlashIndex + 1);

  return { bucket, path };
}

/**
 * Get the url to fetch the artifact from the backend or http/https url
 *
 * @param uri
 * @returns url to fetch the artifact from the backend or http/https url or undefined if the uri is not supported
 */
export function getArtifactUrlFromUri(uri: string, namespace: string): string | undefined {
  // Check if the uri starts with http or https return it as is
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }

  // Otherwise check if the uri is s3
  // If it is not s3, return undefined as we only support fetching from s3 buckets
  const uriComponents = extractS3UriComponents(uri);
  if (!uriComponents) {
    return;
  }

  const { path } = uriComponents;

  return `/api/storage/${namespace}?key=${encodeURIComponent(path)}`;
}
