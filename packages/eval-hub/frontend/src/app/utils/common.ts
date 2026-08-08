/**
 * Parses an S3 URI (e.g. "s3://my-bucket/path/to/data.jsonl") into separate
 * bucket and key components. Returns an empty bucket if the URL does not
 * match the s3:// format.
 */
export const parseS3Url = (url: string): { bucket: string; key: string } => {
  const match = url.match(/^s3:\/\/([^/]+)\/(.+)$/);
  return match ? { bucket: match[1], key: match[2] } : { bucket: '', key: url };
};
