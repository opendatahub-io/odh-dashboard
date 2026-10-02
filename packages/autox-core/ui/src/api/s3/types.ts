export type S3ObjectInfo = {
  key: string;
  last_modified?: string;
  etag?: string;
  size: number;
  storage_class?: string;
};

export type S3CommonPrefix = {
  prefix: string;
};

export type S3ListObjectsResponse = {
  common_prefixes: S3CommonPrefix[];
  contents: S3ObjectInfo[];
  continuation_token?: string;
  delimiter?: string;
  is_truncated: boolean;
  key_count: number;
  max_keys: number;
  name?: string;
  next_continuation_token?: string;
  prefix?: string;
};

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
