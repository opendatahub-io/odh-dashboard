import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { getSecrets } from '~/app/api/k8s';
import type { SecretListItem } from '~/app/types';

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
