import * as z from 'zod';

/* eslint-disable camelcase */
export const S3ObjectInfoSchema = z.object({
  key: z.string(),
  size: z.number(),
  last_modified: z.string().optional(),
  etag: z.string().optional(),
  storage_class: z.string().optional(),
});

export const S3CommonPrefixSchema = z.object({
  prefix: z.string(),
});

export const S3ListObjectsResponseSchema = z.object({
  common_prefixes: z.array(S3CommonPrefixSchema),
  contents: z.array(S3ObjectInfoSchema),
  is_truncated: z.boolean(),
  key_count: z.number(),
  max_keys: z.number(),
  continuation_token: z.string().optional(),
  delimiter: z.string().optional(),
  name: z.string().optional(),
  next_continuation_token: z.string().optional(),
  prefix: z.string().optional(),
});
/* eslint-enable camelcase */

export type S3ObjectInfo = z.infer<typeof S3ObjectInfoSchema>;
export type S3CommonPrefix = z.infer<typeof S3CommonPrefixSchema>;
export type S3ListObjectsResponse = z.infer<typeof S3ListObjectsResponseSchema>;
