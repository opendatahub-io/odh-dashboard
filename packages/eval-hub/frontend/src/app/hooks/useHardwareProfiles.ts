import { useQuery } from '@tanstack/react-query';
import { getHardwareProfiles } from '~/app/api/k8s';
import type { HardwareProfile } from '~/app/types';

type UseHardwareProfilesResult = {
  profiles: HardwareProfile[];
  loaded: boolean;
  error: Error | undefined;
};

export const useHardwareProfiles = (namespace: string | undefined): UseHardwareProfilesResult => {
  const hardwareProfilesQuery = useQuery<HardwareProfile[], Error>({
    queryKey: ['hardwareProfiles', namespace],
    enabled: Boolean(namespace),
    queryFn: ({ signal }) => {
      if (!namespace) {
        throw new Error('Namespace is required to load HardwareProfiles');
      }
      return getHardwareProfiles('', namespace)({ signal });
    },
  });

  const hardwareProfilesLoaded = hardwareProfilesQuery.isSuccess || hardwareProfilesQuery.isError;

  return {
    profiles: hardwareProfilesQuery.data ?? [],
    loaded: hardwareProfilesLoaded,
    error: hardwareProfilesQuery.error ?? undefined,
  };
};
