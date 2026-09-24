import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import * as z from 'zod';
import { getMaaSModels } from '~/app/api/k8s';
import type { MaaSModelsResponse } from '~/app/types';
import { createS3FileFetchers } from '@odh-dashboard/autox-core/ui/api';
import { useS3ListFilesQuery } from '@odh-dashboard/autox-core/ui/hooks';
import { URL_PREFIX } from '~/app/utilities/const';
export { useManagedPipelinesQuery } from './useManagedPipelinesQuery';
export { useSecretCredentialsQuery } from './useSecretCredentialsQuery';
export { useSecretsQuery } from './useSecretsQuery';

export { useS3ListFilesQuery };

const { fetchS3File, fetchS3Json } = createS3FileFetchers(URL_PREFIX);

export { fetchS3File, fetchS3Json };

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
