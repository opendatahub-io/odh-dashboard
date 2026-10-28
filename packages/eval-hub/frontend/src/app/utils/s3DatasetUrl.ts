const S3_DATASET_URL_PATTERN = /^s3:\/\/([^/]+)\/(.+)$/;

export type S3DatasetLocation = {
  bucket: string;
  key: string;
};

/**
 * Parses an S3 dataset URL (`s3://bucket-name/path/to/data`) into the bucket and
 * object key required by the S3DataRef contract. Returns undefined when the URL
 * is not a well-formed S3 URL with both a bucket and a key.
 */
export const parseS3DatasetUrl = (url: string): S3DatasetLocation | undefined => {
  const match = S3_DATASET_URL_PATTERN.exec(url.trim());
  return match ? { bucket: match[1], key: match[2] } : undefined;
};

export const buildS3DatasetUrl = (bucket: string, key: string): string =>
  `s3://${bucket}/${key.replace(/^\/+/, '')}`;
