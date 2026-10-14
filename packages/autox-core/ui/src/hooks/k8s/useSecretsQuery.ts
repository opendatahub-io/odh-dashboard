import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { SecretListItem } from '../../api/k8s/types';
import { useAutoXApi } from '../../context/AutoXApiContext';

const secretsQueryKey = (
  namespace?: string,
  type?: string,
  provider?: 'milvus' | 'pgvector' | 'neo4j',
) => ['secrets', namespace, type, provider] as const;

export function useSecretsQuery(
  namespace?: string,
  type?: string,
  provider?: 'milvus' | 'pgvector' | 'neo4j',
): UseQueryResult<SecretListItem[], Error> {
  const { k8s: k8sApi } = useAutoXApi();
  return useQuery<SecretListItem[], Error>({
    queryKey: secretsQueryKey(namespace, type, provider),
    queryFn: ({ signal }) => {
      if (!namespace) {
        throw new Error('namespace is required');
      }
      return k8sApi.getSecrets('')(namespace, type, provider)({ signal });
    },
    enabled: Boolean(namespace),
    retry: false,
  });
}
