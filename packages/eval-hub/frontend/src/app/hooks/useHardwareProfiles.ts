import { useQuery } from '@tanstack/react-query';
import { getInfo, validateHardwareProfiles } from '~/app/api/k8s';
import type { HardwareProfileInfo } from '~/app/types';

type UseHardwareProfilesResult = {
  profiles: HardwareProfileInfo[];
  loaded: boolean;
  error: Error | undefined;
  compatibilityError: Error | undefined;
};

// Profiles come from the EvalHub service info API, which already filters them to
// the tenant: queue-backed profiles only appear while their LocalQueue exists.
// Only queue-scheduled profiles are offered — node-scheduled profiles are a
// follow-up (the create API supports them, but the UX has not been designed).
export const useHardwareProfiles = (
  namespace: string | undefined,
  providerIds: string[] = [],
): UseHardwareProfilesResult => {
  const normalizedProviderIds = Array.from(
    new Set(providerIds.map((providerId) => providerId.trim()).filter(Boolean)),
  ).toSorted();

  // Shares the query key with useKueueAvailability so both hooks resolve from a
  // single /info fetch.
  const infoQuery = useQuery({
    queryKey: ['evalHubInfo', namespace],
    enabled: Boolean(namespace),
    queryFn: ({ signal }) => {
      if (!namespace) {
        throw new Error('Namespace is required to load HardwareProfiles');
      }
      return getInfo('', namespace)({ signal });
    },
  });

  const profiles = (infoQuery.data?.hardware_profiles ?? []).filter(
    (profile) => profile.scheduling_type === 'queue',
  );
  const hardwareProfileNames = profiles.map((profile) => profile.name);
  const shouldValidateHardwareProfiles =
    Boolean(namespace) &&
    normalizedProviderIds.length > 0 &&
    infoQuery.isSuccess &&
    hardwareProfileNames.length > 0;

  const hardwareProfileValidationQuery = useQuery({
    queryKey: ['hardwareProfileValidation', namespace, hardwareProfileNames, normalizedProviderIds],
    enabled: shouldValidateHardwareProfiles,
    queryFn: ({ signal }) => {
      if (!namespace) {
        throw new Error('Namespace is required to validate HardwareProfiles');
      }
      return validateHardwareProfiles('', namespace, {
        // eslint-disable-next-line camelcase -- BFF API contract field name.
        hardware_profiles: hardwareProfileNames,
        // eslint-disable-next-line camelcase -- BFF API contract field name.
        provider_ids: normalizedProviderIds,
      })({ signal });
    },
  });

  const hardwareProfilesLoaded = infoQuery.isSuccess || infoQuery.isError;

  const compatibilityByProfile = new Map(
    (hardwareProfileValidationQuery.data?.items ?? []).map((compatibility) => [
      compatibility.hardware_profile,
      compatibility,
    ]),
  );

  return {
    profiles: profiles.map((profile) => {
      const compatibility = compatibilityByProfile.get(profile.name);
      return compatibility ? { ...profile, compatibility } : profile;
    }),
    loaded: hardwareProfilesLoaded,
    error: infoQuery.error ?? undefined,
    compatibilityError: hardwareProfileValidationQuery.error ?? undefined,
  };
};
