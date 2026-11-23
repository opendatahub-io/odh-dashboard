import { S3_BUCKET_PATTERN } from './validationUtils';

const S3_DATASET_URL_PATTERN = /^s3:\/\/([^/]+)\/(.+)$/;

// Mirrors the BFF test-data reference validator: keys must stay relative to the
// test data root and cannot traverse out of it.
const hasInvalidKeySegments = (key: string): boolean =>
  key.trim().startsWith('/') || key.split(/[\\/]/).some((segment) => segment.trim() === '..');

export type S3DatasetLocation = {
  bucket: string;
  key: string;
};

/**
 * Parses an S3 dataset URL (`s3://bucket-name/path/to/data`) into the bucket and
 * object key required by the S3DataRef contract. Returns undefined when the URL
 * is not a well-formed S3 URL with both a bucket and a key, when the bucket
 * name fails S3 naming rules (matching the bucket/key form validation), or when
 * the key would fail the BFF test-data reference validator (absolute keys or
 * `..` path-traversal segments).
 */
export const parseS3DatasetUrl = (url: string): S3DatasetLocation | undefined => {
  const match = S3_DATASET_URL_PATTERN.exec(url.trim());
  if (!match || !S3_BUCKET_PATTERN.test(match[1]) || hasInvalidKeySegments(match[2])) {
    return undefined;
  }
  return { bucket: match[1], key: match[2] };
};

export const buildS3DatasetUrl = (bucket: string, key: string): string =>
  `s3://${bucket}/${key.replace(/^\/+/, '')}`;
