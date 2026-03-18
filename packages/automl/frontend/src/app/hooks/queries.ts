import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { URL_PREFIX } from '~/app/utilities/const';

export function useExperimentsQuery(): UseQueryResult<never[], Error> {
  return useQuery({
    queryKey: ['experiments'],
    queryFn: async () => {
      const experiments: never[] = [];
      return experiments;
    },
  });
}

export function useExperimentQuery(
  experimentId?: string,
): UseQueryResult<{ display_name: string }, Error> {
  return useQuery({
    queryKey: ['experiments', experimentId],
    queryFn: async () => {
      // eslint-disable-next-line camelcase
      const experiment = { display_name: 'FAKE_EXPERIMENT_NAME' };
      return experiment;
    },
    enabled: !!experimentId,
  });
}

export type ColumnSchema = {
  name: string;
  type: 'integer' | 'double' | 'timestamp' | 'bool' | 'string';
  values?: (string | number)[];
};

export function useFilesQuery(
  namespace?: string,
  secretName?: string,
  bucket?: string,
  key?: string,
): UseQueryResult<ColumnSchema[], Error> {
  return useQuery({
    queryKey: ['files', namespace, secretName, bucket, key],
    queryFn: async () => {
      if (!namespace || !secretName || !key) {
        return [];
      }

      const params = new URLSearchParams({
        namespace,
        secretName,
        key,
        ...(bucket && { bucket }),
      });

      const response = await fetch(`${URL_PREFIX}/api/v1/s3/file/schema?${params.toString()}`);

      if (!response.ok) {
        let errorMessage = response.statusText;
        try {
          const errorData = await response.json();
          if (errorData?.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch {
          // If parsing fails, fall back to statusText
        }
        throw new Error(`Failed to fetch file schema: ${errorMessage}`);
      }

      const data = await response.json();
      const columns = data?.data?.columns;
      if (!Array.isArray(columns)) {
        return [];
      }
      return columns;
    },
    enabled: Boolean(namespace && secretName && key),
    retry: false,
    placeholderData: [],
  });
}

export function usePipelineRunQuery(
  runId?: string,
): UseQueryResult<{ experiment_id: string }, Error> {
  return useQuery({
    queryKey: ['pipelineRun', runId],
    queryFn: async () => {
      // eslint-disable-next-line camelcase
      const pipelineRun = { experiment_id: 'FAKE_EXPERIMENT_ID' };
      return pipelineRun;
    },
    enabled: !!runId,
  });
}
