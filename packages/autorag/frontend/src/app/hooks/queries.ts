import { useQuery, UseQueryResult } from '@tanstack/react-query';
import * as z from 'zod';
import { getLlamaStackModels, getLlamaStackVectorStores } from '~/app/api/k8s';
import { getPipelineRunFromBFF } from '~/app/api/pipelines';
import {
  LlamaStackModelType,
  LlamaStackModelsResponse,
  LlamaStackVectorStoresResponse,
  PipelineRun,
} from '~/app/types';

export function useLlamaStackModelsQuery(
  namespace: string,
  secretName: string,
  modelType?: LlamaStackModelType,
): UseQueryResult<LlamaStackModelsResponse, Error> {
  return useQuery({
    enabled: !!namespace && !!secretName,
    queryKey: ['models', namespace, secretName],
    queryFn: async () => {
      try {
        const response = await getLlamaStackModels('')(namespace, secretName)({});
        z.object({
          models: z.array(
            z.object({
              id: z.string(),
              type: z.union([z.literal('llm'), z.literal('embedding')]),
              provider: z.string(),
              // eslint-disable-next-line camelcase
              resource_path: z.string(),
            }),
          ),
        }).parse(response);
        return response;
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error('Invalid llama stack models response');
        }
        throw error;
      }
    },
    select: modelType
      ? (data) => ({ models: data.models.filter((m) => m.type === modelType) })
      : undefined,
  });
}

// TODO: Remove mock data once the secretName form field is implemented
// and users can provide a real secret to query LlamaStack vector stores.
/* eslint-disable camelcase */
const MOCK_LLAMA_STACK_VECTOR_STORES: LlamaStackVectorStoresResponse = {
  vector_stores: [
    {
      id: 'vs_00000000-0000-0000-0000-000000000001',
      name: 'test-milvus-store',
      status: 'completed',
      provider: 'milvus',
    },
    {
      id: 'vs_00000000-0000-0000-0000-000000000002',
      name: 'test-milvus-store2',
      status: 'in_progress',
      provider: 'milvus',
    },
    {
      id: 'vs_00000000-0000-0000-0000-000000000003',
      name: 'test-faiss-store',
      status: 'completed',
      provider: 'faiss',
    },
  ],
};
/* eslint-enable camelcase */

export function useLlamaStackVectorStoresQuery(
  namespace: string,
  // secretName is optional for now until the secretName form field is created
  secretName?: string,
  providers?: string[],
): UseQueryResult<LlamaStackVectorStoresResponse, Error> {
  return useQuery({
    queryKey: ['vectorStores', namespace, secretName, providers],
    queryFn: secretName
      ? () => getLlamaStackVectorStores('')(namespace, secretName)({})
      : () => Promise.resolve(MOCK_LLAMA_STACK_VECTOR_STORES),
    // Only show completed vector stores. Additionally filter by provider
    // when a non-empty providers array is given (undefined or [] skips provider filtering).
    select: (data) => ({
      // eslint-disable-next-line camelcase
      vector_stores: data.vector_stores.filter(
        (vs) =>
          vs.status === 'completed' && (!providers?.length || providers.includes(vs.provider)),
      ),
    }),
  });
}

const TERMINAL_STATES = new Set(['SUCCEEDED', 'FAILED', 'CANCELED', 'SKIPPED']);
const POLL_INTERVAL_MS = 5000;

export function usePipelineRunQuery(
  runId?: string,
  namespace?: string,
): UseQueryResult<PipelineRun, Error> {
  return useQuery({
    queryKey: ['pipelineRun', runId, namespace],
    queryFn: ({ signal }) => getPipelineRunFromBFF('', runId!, namespace!, { signal }),
    enabled: !!runId && !!namespace,
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      if (!state || TERMINAL_STATES.has(state)) {
        return false;
      }
      return POLL_INTERVAL_MS;
    },
  });
}
