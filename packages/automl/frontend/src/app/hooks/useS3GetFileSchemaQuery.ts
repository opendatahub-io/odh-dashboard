import { useQuery, UseQueryResult } from '@tanstack/react-query';
import * as z from 'zod';
import { useS3FileFetchers } from '@odh-dashboard/autox-core/ui/hooks';

export type TaskType = 'binary' | 'multiclass' | 'regression';

export type ColumnSchema = {
  name: string;
  type: 'integer' | 'double' | 'timestamp' | 'bool' | 'string';
  task_type: TaskType;
  unique_count?: number;
  values?: (string | number)[];
};

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

export function useS3GetFileSchemaQuery(
  namespace?: string,
  secretName?: string,
  bucket?: string,
  key?: string,
): UseQueryResult<ColumnSchema[], Error> {
  const { fetchS3Json } = useS3FileFetchers();
  return useQuery({
    queryKey: ['files', namespace, secretName, bucket, key],
    queryFn: async ({ signal }) => {
      if (!namespace || !secretName || !key) {
        return [];
      }

      const result = await fetchS3Json<{ data?: { columns?: unknown } }>(namespace, key, {
        signal,
        secretName,
        bucket,
        view: 'schema',
      });
      const columns = result.data?.columns;

      if (!Array.isArray(columns)) {
        throw new Error('Unexpected API response: column data is missing or invalid');
      }

      try {
        return ColumnSchemaArraySchema.parse(columns);
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
    placeholderData: [],
  });
}
