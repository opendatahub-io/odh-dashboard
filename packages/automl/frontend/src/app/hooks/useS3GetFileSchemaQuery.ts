import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import * as z from 'zod';
import React from 'react';
import { useS3CacheActions, useS3FileFetchers } from '@odh-dashboard/autox-core/ui/hooks';

export type TaskType = 'binary' | 'multiclass' | 'regression';

export type ColumnSchema = {
  name: string;
  type: 'integer' | 'double' | 'timestamp' | 'bool' | 'string';
  task_type: TaskType;
  unique_count?: number;
  values?: (string | number)[];
};

export type DatasetSample = {
  columns: ColumnSchema[];
  sampleRows: string[][];
  sampleSize: number;
  parseWarnings: number;
};

const EMPTY_SAMPLE: DatasetSample = {
  columns: [],
  sampleRows: [],
  sampleSize: 0,
  parseWarnings: 0,
};

export const getS3FileSchemaQueryKey = (
  namespace?: string,
  secretName?: string,
  bucket?: string,
  key?: string,
) => ['files', namespace, secretName, bucket, key] as const;

const ColumnSchemaArraySchema = z.array(
  z.object({
    name: z.string(),
    type: z.enum(['integer', 'double', 'timestamp', 'bool', 'string']),
    // eslint-disable-next-line camelcase -- matches API response field name
    task_type: z.enum(['binary', 'multiclass', 'regression']),
    // eslint-disable-next-line camelcase -- matches API response field name
    unique_count: z.number().int().nonnegative().optional(),
    values: z.array(z.union([z.string(), z.number()])).optional(),
  }),
);

type FileSchemaQueryResult = Omit<UseQueryResult<DatasetSample, Error>, 'data'> & {
  data: ColumnSchema[];
  sample?: DatasetSample;
  resetSchemaCache: () => void;
};

export function useS3GetFileSchemaQuery(
  namespace?: string,
  secretName?: string,
  bucket?: string,
  key?: string,
): FileSchemaQueryResult {
  const { fetchS3Json } = useS3FileFetchers();
  const { invalidateS3JsonCache } = useS3CacheActions();
  const queryClient = useQueryClient();
  const queryKey = React.useMemo(
    () => getS3FileSchemaQueryKey(namespace, secretName, bucket, key),
    [namespace, secretName, bucket, key],
  );
  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      if (!namespace || !secretName || !key) {
        return EMPTY_SAMPLE;
      }

      const result = await fetchS3Json<{
        data?: {
          columns?: unknown;
          sample_rows?: unknown;
          sample_size?: unknown;
          parse_warnings?: unknown;
        };
      }>(namespace, key, {
        signal,
        secretName,
        bucket,
        view: 'schema',
        fresh: true,
      });
      const columns = result.data?.columns;

      if (!Array.isArray(columns)) {
        throw new Error('Unexpected API response: column data is missing or invalid');
      }

      try {
        const parsedColumns = ColumnSchemaArraySchema.parse(columns);
        const sampleRows = z
          .array(z.array(z.string()))
          .max(100)
          .parse(result.data?.sample_rows ?? []);
        const sampleSize = z
          .number()
          .int()
          .min(0)
          .max(100)
          .parse(result.data?.sample_size ?? sampleRows.length);
        const parseWarnings = z
          .number()
          .int()
          .nonnegative()
          .parse(result.data?.parse_warnings ?? 0);
        if (
          sampleSize !== sampleRows.length ||
          sampleRows.some((row) => row.length !== parsedColumns.length)
        ) {
          throw new Error('Invalid sample response: row and column counts do not match');
        }
        return { columns: parsedColumns, sampleRows, sampleSize, parseWarnings };
      } catch (error) {
        if (error instanceof z.ZodError) {
          const issues = error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join(', ');
          throw new Error(`Invalid column schema response: ${issues}`);
        }
        throw error;
      }
    },
    enabled: Boolean(namespace && secretName && key),
    retry: false,
    // Opening a preview reuses the selected file snapshot instead of restarting the check.
    refetchOnMount: false,
    placeholderData: EMPTY_SAMPLE,
  });

  const resetSchemaCache = React.useCallback(() => {
    queryClient.setQueryData(queryKey, EMPTY_SAMPLE);
    if (namespace && key) {
      void invalidateS3JsonCache(namespace, key);
    }
  }, [invalidateS3JsonCache, key, namespace, queryClient, queryKey]);

  return {
    ...query,
    data: query.data?.columns ?? EMPTY_SAMPLE.columns,
    sample: query.data,
    resetSchemaCache,
  };
}
