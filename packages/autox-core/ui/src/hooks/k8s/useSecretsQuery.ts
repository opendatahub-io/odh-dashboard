import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import type { K8sApi, SecretListItem } from '../../api/k8s';
import { useAutoXApi } from '../../context';

export const secretsQueryKey = (namespace?: string, type?: string) =>
  ['secrets', namespace, type] as const;

export const createSecretsQueryOptions = (
  k8sApi: K8sApi,
  namespace?: string,
  type?: string,
): UseQueryOptions<SecretListItem[], Error> => ({
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

export function useSecretsQuery(
  namespace?: string,
  type?: string,
): UseQueryResult<SecretListItem[], Error> {
  const { k8s: k8sApi } = useAutoXApi();
  return useQuery(createSecretsQueryOptions(k8sApi, namespace, type));
}
