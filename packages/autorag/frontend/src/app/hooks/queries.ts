import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { getPipelineRunFromBFF } from '~/app/api/pipelines';
import { LlamaStackModelType, LlamaStackModelsResponse, PipelineRun } from '~/app/types';
import { isTerminalState } from '~/app/utilities/pipelineRunStates';

const PIPELINE_RUN_POLL_INTERVAL = 10000; // 10 seconds

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

/**
 * Fetches a pipeline run with automatic polling.
 * Polls every 10 seconds until the run reaches a terminal state (SUCCEEDED, FAILED, CANCELED).
 */
export function usePipelineRunQuery(
  namespace?: string,
  runId?: string,
): UseQueryResult<PipelineRun, Error> {
  return useQuery({
    queryKey: ['pipelineRun', namespace, runId],
    queryFn: async () => {
      if (!runId) {
        throw new Error('Run ID is required');
      }
      if (!namespace) {
        throw new Error('Namespace is required');
      }
      return getPipelineRunFromBFF('', namespace, runId);
    },
    enabled: !!runId && !!namespace,
    // Poll every 10 seconds
    refetchInterval: (query) => {
      const { data } = query.state;
      // Stop polling if we have data and it's in a terminal state
      if (data && isTerminalState(data.state)) {
        return false;
      }
      return PIPELINE_RUN_POLL_INTERVAL;
    },
    // Also refetch on window focus, but respect the terminal state
    refetchOnWindowFocus: (query) => {
      const { data } = query.state;
      // Don't refetch on focus if in terminal state
      return !(data && isTerminalState(data.state));
    },
  });
}
