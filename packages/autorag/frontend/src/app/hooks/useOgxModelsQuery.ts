import { useQuery, UseQueryResult } from '@tanstack/react-query';
import * as z from 'zod';
import { getOgxModels } from '~/app/api/k8s';
import type { OgxModelsResponse, OgxModelType } from '~/app/types';

/* eslint-disable camelcase */
export function useOgxModelsQuery(
  namespace: string,
  secretName: string,
  modelType?: OgxModelType,
): UseQueryResult<OgxModelsResponse, Error> {
  return useQuery({
    enabled: !!namespace && !!secretName,
    queryKey: ['autorag', 'models', namespace, secretName],
    queryFn: async () => {
      try {
        const response = await getOgxModels('')(namespace, secretName)({});
        const validated = z
          .object({
            models: z.array(
              z.object({
                id: z.string(),
                type: z.string(),
                provider: z.string(),
                resource_path: z.string(),
              }),
            ),
          })
          .parse(response);
        return {
          models: validated.models.filter(
            (m): m is typeof m & { type: 'llm' | 'embedding' } =>
              m.type === 'llm' || m.type === 'embedding',
          ),
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error('Invalid Open GenAI Stack models response');
        }
        throw error;
      }
    },
    select: modelType
      ? (data) => ({ models: data.models.filter((m) => m.type === modelType) })
      : undefined,
  });
}
/* eslint-enable camelcase */
