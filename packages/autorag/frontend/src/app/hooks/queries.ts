import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import * as z from 'zod';
import { useS3ListFilesQuery } from '@odh-dashboard/autox-core/ui/hooks';
import { getMaaSModels } from '~/app/api/k8s';
import type { MaaSModelsResponse } from '~/app/types';

export { useManagedPipelinesQuery } from './useManagedPipelinesQuery';
export { useSecretCredentialsQuery } from './useSecretCredentialsQuery';

export { useS3ListFilesQuery };

export function useMaaSModelsQuery(
  namespace: string,
  secretName: string,
): UseQueryResult<MaaSModelsResponse, Error> {
  return useQuery({
    enabled: !!namespace && !!secretName,
    queryKey: ['autorag', 'maasModels', namespace, secretName],
    queryFn: async ({ signal }) => {
      const response = await getMaaSModels('')(namespace, secretName)({ signal });
      try {
        return z
          .object({
            models: z.array(
              z.object({
                id: z.string(),
                // eslint-disable-next-line camelcase
                display_name: z.string().optional(),
                description: z.string().optional(),
                // eslint-disable-next-line camelcase
                owned_by: z.string().optional(),
                ready: z.boolean(),
              }),
            ),
          })
          .parse(response);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error('Invalid MaaS models response');
        }
        throw error;
      }
    },
    staleTime: 300_000,
  });
}
