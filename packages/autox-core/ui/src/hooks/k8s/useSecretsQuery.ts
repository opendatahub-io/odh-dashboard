import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { SecretListItem } from '../../api/k8s/types';
import { useAutoXApi } from '../../context/AutoXApiContext';

const secretsQueryKey = (namespace?: string, type?: string) =>
  ['secrets', namespace, type] as const;

export function useSecretsQuery(
  namespace?: string,
  type?: string,
): UseQueryResult<SecretListItem[], Error> {
  const { k8s: k8sApi } = useAutoXApi();
  return useQuery<SecretListItem[], Error>({
    queryKey: secretsQueryKey(namespace, type),
    queryFn: ({ signal }) => {
      if (!namespace) {
        throw new Error('namespace is required');
      }
      return k8sApi.getSecrets('')(namespace, type)({ signal });
    },
    enabled: Boolean(namespace),
    retry: false,
  });
}
