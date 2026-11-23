import { useQuery } from '@tanstack/react-query';
import { getInfo } from '~/app/api/k8s';
import type { KueueAvailability } from '~/app/types';

type UseKueueAvailabilityResult = {
  availability: KueueAvailability | undefined;
  loaded: boolean;
  error: Error | undefined;
};

// Queue availability is derived from the EvalHub service info API: the tenant has
// queue-backed scheduling when the service offers at least one queue-scheduled
// hardware profile, and scheduling is ready when at least one of their LocalQueues
// is active. The service only includes queue-backed profiles while their LocalQueue
// exists in the tenant namespace.
export const toAvailability = (
  hardwareProfiles:
    { scheduling_type?: string; queue_availability?: { status: string } }[] | undefined,
): KueueAvailability => {
  const queueProfiles = (hardwareProfiles ?? []).filter(
    (profile) => profile.scheduling_type === 'queue',
  );
  return {
    /* eslint-disable camelcase -- BFF API contract field name */
    enabled: queueProfiles.length > 0,
    scheduling_ready: queueProfiles.some(
      (profile) => profile.queue_availability?.status === 'active',
    ),
  };
  /* eslint-enable camelcase */
};

export const useKueueAvailability = (namespace: string | undefined): UseKueueAvailabilityResult => {
  const infoQuery = useQuery({
    queryKey: ['evalHubInfo', namespace],
    enabled: Boolean(namespace),
    queryFn: ({ signal }) => {
      if (!namespace) {
        throw new Error('Namespace is required to load queue availability');
      }
      return getInfo('', namespace)({ signal });
    },
  });

  return {
    availability: infoQuery.data ? toAvailability(infoQuery.data.hardware_profiles) : undefined,
    loaded: infoQuery.isSuccess || infoQuery.isError,
    error: infoQuery.error ?? undefined,
  };
};
