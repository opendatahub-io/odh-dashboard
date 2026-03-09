import { useQuery, UseQueryResult } from '@tanstack/react-query';
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
  modelType?: LlamaStackModelType,
): UseQueryResult<LlamaStackModelsResponse, Error> {
  return useQuery({
    queryKey: ['models', modelType],
    // TODO: Replace with BFF call to "api/v1/lsd/models" once the endpoint is implemented.
    // eslint-disable-next-line camelcase
    queryFn: async (): Promise<LlamaStackModelsResponse> => ({
      models: [
        {
          id: 'meta-llama/Llama-3.1-8B-Instruct',
          type: 'llm',
          provider: 'ollama',
          // eslint-disable-next-line camelcase
          resource_path: 'ollama://models/meta-llama/Llama-3.1-8B-Instruct',
        },
        {
          id: 'meta-llama/Llama-3.1-70B-Instruct',
          type: 'llm',
          provider: 'ollama',
          // eslint-disable-next-line camelcase
          resource_path: 'ollama://models/meta-llama/Llama-3.1-70B-Instruct',
        },
        {
          id: 'all-minilm:l6-v2',
          type: 'embedding',
          provider: 'ollama',
          // eslint-disable-next-line camelcase
          resource_path: 'ollama://models/all-minilm:l6-v2',
        },
        {
          id: 'nomic-embed-text',
          type: 'embedding',
          provider: 'ollama',
          // eslint-disable-next-line camelcase
          resource_path: 'ollama://models/nomic-embed-text',
        },
      ],
    }),
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
