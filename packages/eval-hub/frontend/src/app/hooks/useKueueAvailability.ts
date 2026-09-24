import { useQuery } from '@tanstack/react-query';
import { getKueueAvailability } from '~/app/api/k8s';
import type { KueueAvailability } from '~/app/types';

type UseKueueAvailabilityResult = {
  availability: KueueAvailability | undefined;
  loaded: boolean;
  error: Error | undefined;
};

export const useKueueAvailability = (namespace: string | undefined): UseKueueAvailabilityResult => {
  const kueueAvailabilityQuery = useQuery<KueueAvailability, Error>({
    queryKey: ['kueueAvailability', namespace],
    enabled: Boolean(namespace),
    queryFn: ({ signal }) => {
      if (!namespace) {
        throw new Error('Namespace is required to load Kueue availability');
      }
      return getKueueAvailability('', namespace)({ signal });
    },
  });

  return {
    availability: kueueAvailabilityQuery.data,
    loaded: kueueAvailabilityQuery.isSuccess || kueueAvailabilityQuery.isError,
    error: kueueAvailabilityQuery.error ?? undefined,
  };
};
