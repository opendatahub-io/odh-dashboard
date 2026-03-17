import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { getLlamaStackModels } from '~/app/api/k8s';
import { LlamaStackModelsResponse, LlamaStackModelType } from '~/app/types';

export function useLlamaStackModelsQuery(
  namespace: string,
  secretName: string,
  modelType?: LlamaStackModelType,
): UseQueryResult<LlamaStackModelsResponse, Error> {
  return useQuery({
    queryKey: ['models', namespace, secretName, modelType],
    queryFn: () => getLlamaStackModels('')(namespace, secretName)({}),
    select: modelType
      ? (data) => ({ models: data.models.filter((m) => m.type === modelType) })
      : undefined,
  });
}

export function usePipelineRunQuery(
  runId?: string,
): UseQueryResult<{ display_name: string }, Error> {
  return useQuery({
    queryKey: ['pipelineRun', runId],
    queryFn: async () => {
      // eslint-disable-next-line camelcase
      const pipelineRun = { display_name: 'RUN_NAME' };
      return pipelineRun;
    },
    enabled: !!runId,
  });
}
