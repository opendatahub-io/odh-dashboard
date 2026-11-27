import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import * as z from 'zod';
import { useS3FileFetchers } from '@odh-dashboard/autox-core/ui/hooks';
import { getS3FileSchemaQueryKey } from './useS3GetFileSchemaQuery';

type RowCountSnapshot = {
  rowCount: number;
  schemaUpdatedAt: number | undefined;
};

const RowCountResponseSchema = z.object({
  data: z.object({
    // eslint-disable-next-line camelcase -- matches API response field name
    row_count: z.number().int().nonnegative(),
  }),
});

export function useS3GetFileRowCountQuery(
  namespace?: string,
  secretName?: string,
  bucket?: string,
  key?: string,
  enabled = true,
): UseQueryResult<RowCountSnapshot, Error> {
  const { fetchS3Json } = useS3FileFetchers();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['fileRowCount', namespace, secretName, bucket, key],
    queryFn: async ({ signal }) => {
      if (!namespace || !secretName || !key) {
        throw new Error('Select a connection and CSV file to count rows');
      }
      // A first count (including separate → automatic) must refresh any cached schema.
      await queryClient.refetchQueries({
        queryKey: getS3FileSchemaQueryKey(namespace, secretName, bucket, key),
        exact: true,
      });
      const schemaUpdatedAt = queryClient.getQueryState(
        getS3FileSchemaQueryKey(namespace, secretName, bucket, key),
      )?.dataUpdatedAt;
      signal.throwIfAborted();
      const result = await fetchS3Json<unknown>(namespace, key, {
        signal,
        secretName,
        bucket,
        view: 'row-count',
        fresh: true,
      });
      const parsed = RowCountResponseSchema.safeParse(result);
      if (!parsed.success) {
        throw new Error('Unexpected API response: CSV row count is missing or invalid');
      }
      return { rowCount: parsed.data.data.row_count, schemaUpdatedAt };
    },
    enabled: enabled && Boolean(namespace && secretName && key),
    // Match the schema query: returning to the form reuses the selected file snapshot.
    refetchOnMount: false,
    retry: false,
  });
}
