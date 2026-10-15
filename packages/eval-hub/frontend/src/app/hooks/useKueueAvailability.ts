import { useQuery } from '@tanstack/react-query';
import { getKueueAvailability } from '~/app/api/k8s';
import { KUEUE_INTEGRATION_ENABLED } from '~/app/utilities/const';
import type { KueueAvailability } from '~/app/types';

type UseKueueAvailabilityResult = {
  availability: KueueAvailability | undefined;
  loaded: boolean;
  error: Error | undefined;
};

export const useKueueAvailability = (namespace: string | undefined): UseKueueAvailabilityResult => {
  const kueueAvailabilityQuery = useQuery<KueueAvailability, Error>({
    queryKey: ['kueueAvailability', namespace],
    enabled: KUEUE_INTEGRATION_ENABLED && Boolean(namespace),
    queryFn: ({ signal }) => {
      if (!namespace) {
        throw new Error('Namespace is required to load Kueue availability');
      }
      return getKueueAvailability('', namespace)({ signal });
    },
  });

  // RHOAIENG-99645: the Kueue integration is disabled — report the off state without
  // fetching. `loaded: true` is load-bearing: consumers gate skeletons and form validity
  // on it, so a permanently-pending query would block the submit button.
  if (!KUEUE_INTEGRATION_ENABLED) {
    return { availability: undefined, loaded: true, error: undefined };
  }

  return {
    availability: kueueAvailabilityQuery.data,
    loaded: kueueAvailabilityQuery.isSuccess || kueueAvailabilityQuery.isError,
    error: kueueAvailabilityQuery.error ?? undefined,
  };
};
