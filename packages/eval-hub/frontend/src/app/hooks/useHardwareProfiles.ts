import { useQuery } from '@tanstack/react-query';
import { getHardwareProfiles, validateHardwareProfiles } from '~/app/api/k8s';
import type { HardwareProfile } from '~/app/types';

type UseHardwareProfilesResult = {
  profiles: HardwareProfile[];
  loaded: boolean;
  error: Error | undefined;
  compatibilityError: Error | undefined;
};

export const useHardwareProfiles = (
  namespace: string | undefined,
  providerIds: string[] = [],
): UseHardwareProfilesResult => {
  const normalizedProviderIds = Array.from(
    new Set(providerIds.map((providerId) => providerId.trim()).filter(Boolean)),
  ).toSorted();

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

  const hardwareProfileNames = (hardwareProfilesQuery.data ?? []).map((profile) => profile.name);
  const shouldValidateHardwareProfiles =
    Boolean(namespace) &&
    normalizedProviderIds.length > 0 &&
    hardwareProfilesQuery.isSuccess &&
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

  const hardwareProfilesLoaded = hardwareProfilesQuery.isSuccess || hardwareProfilesQuery.isError;
  const compatibilityByProfile = new Map(
    (hardwareProfileValidationQuery.data?.items ?? []).map((compatibility) => [
      compatibility.hardware_profile,
      compatibility,
    ]),
  );

  return {
    profiles: (hardwareProfilesQuery.data ?? []).map((profile) => {
      const compatibility = compatibilityByProfile.get(profile.name);
      return compatibility ? { ...profile, compatibility } : profile;
    }),
    loaded: hardwareProfilesLoaded,
    error: hardwareProfilesQuery.error ?? undefined,
    compatibilityError: hardwareProfileValidationQuery.error ?? undefined,
  };
};
