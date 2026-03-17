import { useQuery, UseQueryResult } from '@tanstack/react-query';
import * as z from 'zod';
import { getLlamaStackModels } from '~/app/api/k8s';
import { LlamaStackModelsResponse, LlamaStackModelType } from '~/app/types';

export function useLlamaStackModelsQuery(
  namespace: string,
  secretName: string,
  modelType?: LlamaStackModelType,
): UseQueryResult<LlamaStackModelsResponse, Error> {
  return useQuery({
    queryKey: ['models', namespace, secretName, modelType],
    enabled: !!namespace && !!secretName,
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
