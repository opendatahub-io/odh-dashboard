import type { ReactNode } from 'react';
import type { EmptyStateProps } from '@patternfly/react-core';
import * as z from 'zod';

// FileExplorer domain types -------------------------------------------------->

export type RenderableDetailValue = string | number | boolean | ReactNode;

/** A data source that the file explorer can browse (e.g. an S3 connection). */
export interface Source {
  name: string;
  bucket?: string;
  count?: number;
}

export type Sources = Source[];

/**
 * A single item (file or folder) displayed in the file explorer table.
 * Storage-specific wrappers map their API responses into this shape.
 */
export interface ExplorerFile {
  name: string;
  path: string;
  size?: string;
  type: string;
  items?: number;
  details?: Record<string, RenderableDetailValue>;
  hidden?: boolean;
  selectable?: boolean;
  forceShowAsSelected?: boolean;
}

export type ExplorerFiles<T extends ExplorerFile = ExplorerFile> = T[];

/** A {@link ExplorerFile} whose `type` is `'folder'`, making it navigable in the breadcrumb trail. */
export interface Folder extends ExplorerFile {
  type: 'folder';
  items: number;
}

/** Configuration for the empty-state banner shown when no files are available or an error occurs. */
export type FileExplorerEmptyStateConfig = Pick<
  EmptyStateProps,
  'titleText' | 'headingLevel' | 'icon' | 'variant' | 'status'
> & {
  body?: ReactNode;
  actions?: ReactNode;
};

// S3 schemas ----------------------------------------------------------------->

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
