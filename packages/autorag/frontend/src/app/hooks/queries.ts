import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { getLlamaStackModels } from '~/app/api/k8s';
import { LlamaStackModelType, LlamaStackModelsResponse } from '~/app/types';

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

export function useLlamaStackModelsQuery(
  namespace: string,
  //secretName is optional for now until the secretName form field is created
  secretName?: string,
  modelType?: LlamaStackModelType,
): UseQueryResult<LlamaStackModelsResponse, Error> {
  return useQuery({
    queryKey: ['models', namespace, secretName, modelType],
    queryFn: () => getLlamaStackModels('')(namespace, secretName!)({}),
    enabled: !!secretName,
    select: modelType
      ? (data) => ({ models: data.models.filter((m) => m.type === modelType) })
      : undefined,
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
