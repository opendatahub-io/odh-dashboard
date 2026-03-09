import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { getLlamaStackModels } from '~/app/api/k8s';
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

// TODO: Remove mock data once the secretName form field is implemented
// and users can provide a real secret to query LlamaStack models.
/* eslint-disable camelcase */
const MOCK_LLAMA_STACK_MODELS: LlamaStackModelsResponse = {
  models: [
    {
      id: 'granite3.2:8b',
      type: 'llm',
      provider: 'ollama',
      resource_path: 'ollama://granite3.2:8b',
    },
    {
      id: 'llama3.2:3b',
      type: 'llm',
      provider: 'ollama',
      resource_path: 'ollama://llama3.2:3b',
    },
    {
      id: 'all-minilm:l6-v2',
      type: 'embedding',
      provider: 'ollama',
      resource_path: 'ollama://all-minilm:l6-v2',
    },
    {
      id: 'nomic-embed-text:v1.5',
      type: 'embedding',
      provider: 'ollama',
      resource_path: 'ollama://nomic-embed-text:v1.5',
    },
  ],
};
/* eslint-enable camelcase */

export function useLlamaStackModelsQuery(
  namespace: string,
  // secretName is optional for now until the secretName form field is created
  secretName?: string,
  modelType?: LlamaStackModelType,
): UseQueryResult<LlamaStackModelsResponse, Error> {
  return useQuery({
    queryKey: ['models', namespace, secretName, modelType],
    queryFn: secretName
      ? () => getLlamaStackModels('')(namespace, secretName)({})
      : () => Promise.resolve(MOCK_LLAMA_STACK_MODELS),
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
  runId?: string,
  namespace?: string,
): UseQueryResult<PipelineRun, Error> {
  return useQuery({
    queryKey: ['pipelineRun', namespace, runId],
	queryFn: ({ signal }) => {
      if (!runId) {
        throw new Error('Run ID is required');
      }
      if (!namespace) {
        throw new Error('Namespace is required');
      }
      return getPipelineRunFromBFF('', namespace!, runId!, { signal })
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
