import { useQuery, UseQueryResult } from '@tanstack/react-query';
import * as z from 'zod';
import { getOgxVectorStores } from '~/app/api/k8s';
import type { OgxFilteredVectorStoreProvidersResponse } from '~/app/types';

/* eslint-disable camelcase */
export function useOgxVectorStoreProvidersQuery(
  namespace: string,
  secretName: string,
  providerTypes?: string[],
): UseQueryResult<OgxFilteredVectorStoreProvidersResponse, Error> {
  return useQuery({
    enabled: !!namespace && !!secretName,
    queryKey: ['autorag', 'vectorStoreProviders', namespace, secretName],
    queryFn: async () => {
      try {
        const response = await getOgxVectorStores('')(namespace, secretName)({});
        z.object({
          vector_store_providers: z.array(
            z.object({ provider_id: z.string(), provider_type: z.string() }),
          ),
        }).parse(response);
        return response;
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error('Invalid Open GenAI Stack vector store providers response');
        }
        throw error;
      }
    },
    select: (data) => ({
      vector_store_providers: data.vector_store_providers.filter(
        (p) => !providerTypes?.length || providerTypes.includes(p.provider_type),
      ),
      totalProviderCount: data.vector_store_providers.length,
    }),
  });
}
/* eslint-enable camelcase */
