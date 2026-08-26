import { useQuery, UseQueryResult } from '@tanstack/react-query';
import * as z from 'zod';

export {
  usePipelineRunQuery,
  useS3FileFetchers,
  useS3ListFilesQuery,
} from '@odh-dashboard/autox-core/ui/hooks';
import { getOgxModels, getOgxVectorStores, getSecretByName, getSecrets } from '~/app/api/k8s';
import { getManagedPipelines } from '~/app/api/pipelines';
import {
  OgxModelsResponse,
  OgxModelType,
  OgxFilteredVectorStoreProvidersResponse,
  ManagedPipeline,
  SecretListItem,
} from '~/app/types';

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
                // eslint-disable-next-line camelcase
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

export function useOgxVectorStoreProvidersQuery(
  namespace: string,
  secretName: string,
  providerTypes?: string[],
): UseQueryResult<OgxFilteredVectorStoreProvidersResponse, Error> {
  return useQuery({
    enabled: !!namespace && !!secretName,
    // providerTypes is intentionally excluded: select transforms cached data without
    // affecting the cache, so different provider type filters safely share one cache entry.
    queryKey: ['autorag', 'vectorStoreProviders', namespace, secretName],
    queryFn: async () => {
      try {
        const response = await getOgxVectorStores('')(namespace, secretName)({});
        z.object({
          // eslint-disable-next-line camelcase
          vector_store_providers: z.array(
            z.object({
              // eslint-disable-next-line camelcase
              provider_id: z.string(),
              // eslint-disable-next-line camelcase
              provider_type: z.string(),
            }),
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
    // Filter by provider_type when a non-empty providerTypes array is given.
    // totalProviderCount preserves the unfiltered count so the UI can distinguish
    // "no providers at all" from "providers exist but none are supported".
    select: (data) => ({
      // eslint-disable-next-line camelcase
      vector_store_providers: data.vector_store_providers.filter(
        (p) => !providerTypes?.length || providerTypes.includes(p.provider_type),
      ),
      totalProviderCount: data.vector_store_providers.length,
    }),
  });
}

export function useSecretCredentialsQuery(
  namespace?: string,
  secretName?: string,
): UseQueryResult<Record<string, string>, Error> {
  return useQuery({
    enabled: !!namespace && !!secretName,
    queryKey: ['autorag', 'secretCredentials', namespace, secretName],
    queryFn: async ({ signal }) => {
      if (!namespace || !secretName) {
        throw new Error('namespace and secretName are required');
      }
      return getSecretByName('')(namespace, secretName)({ signal });
    },
    staleTime: 300_000,
    retry: false,
  });
}

export function useSecretsQuery(
  namespace: string,
  type?: 'storage' | 'ogx',
): UseQueryResult<SecretListItem[], Error> {
  return useQuery({
    enabled: !!namespace,
    queryKey: ['autorag', 'secrets', namespace, type],
    queryFn: ({ signal }) => getSecrets('')(namespace, type)({ signal }),
  });
}

export function useManagedPipelinesQuery(
  namespace?: string,
): UseQueryResult<ManagedPipeline[], Error> {
  return useQuery({
    enabled: !!namespace,
    queryKey: ['autorag', 'managedPipelines', namespace],
    queryFn: ({ signal }) => getManagedPipelines('', namespace!, { signal }),
    staleTime: 60_000,
    // One retry: this query gates the "Run indexing pipeline" action; a single transient
    // failure should not permanently hide it for the session.
    retry: 1,
  });
}
