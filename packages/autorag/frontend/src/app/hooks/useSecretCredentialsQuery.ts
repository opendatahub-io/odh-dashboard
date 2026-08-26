import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { getSecretByName } from '~/app/api/k8s';

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
