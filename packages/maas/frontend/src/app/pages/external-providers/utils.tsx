import { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import { ExternalProvider } from '~/app/types/external-models';
import { mapAuthMechanismToHumanReadable } from '~/app/pages/external-models/utils';
import { normalizePhase } from '~/app/utilities/phaseLabelUtils';
import { ExternalProvidersFilterDataType, ExternalProvidersFilterOptions } from './const';

export const getExternalProviderResource = (provider: ExternalProvider): K8sResourceCommon => ({
  apiVersion: 'maas.opendatahub.io/v1alpha1',
  kind: 'ExternalProvider',
  metadata: {
    name: provider.name,
    namespace: provider.namespace,
  },
});

const getFilterKeyword = (
  filterData: ExternalProvidersFilterDataType,
  key: ExternalProvidersFilterOptions,
): string | undefined => {
  const value = filterData[key];
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim().toLowerCase();
  return trimmed || undefined;
};

export const hasActiveExternalProvidersFilters = (
  filterData: ExternalProvidersFilterDataType,
): boolean => Object.values(filterData).some((value) => value?.trim());

export const filterExternalProviders = (
  providers: ExternalProvider[],
  filterData: ExternalProvidersFilterDataType,
): ExternalProvider[] => {
  const nameKeyword = getFilterKeyword(filterData, ExternalProvidersFilterOptions.name);
  const providerTypeKeyword = getFilterKeyword(
    filterData,
    ExternalProvidersFilterOptions.providerType,
  );
  const authKeyword = getFilterKeyword(filterData, ExternalProvidersFilterOptions.authentication);
  const statusKeyword = getFilterKeyword(filterData, ExternalProvidersFilterOptions.status);

  return providers.filter((provider) => {
    if (nameKeyword) {
      const matchesName =
        provider.name.toLowerCase().includes(nameKeyword) ||
        provider.displayName?.toLowerCase().includes(nameKeyword) ||
        provider.description?.toLowerCase().includes(nameKeyword);
      if (!matchesName) {
        return false;
      }
    }

    if (providerTypeKeyword && !provider.provider.toLowerCase().includes(providerTypeKeyword)) {
      return false;
    }

    if (authKeyword) {
      const authLabel = mapAuthMechanismToHumanReadable(provider.authMechanism).toLowerCase();
      const authValue = provider.authMechanism.toLowerCase();
      if (!authLabel.includes(authKeyword) && !authValue.includes(authKeyword)) {
        return false;
      }
    }

    if (statusKeyword) {
      const normalizedPhase = normalizePhase(provider.phase).toLowerCase();
      const rawPhase = (provider.phase ?? '').toLowerCase();
      if (!normalizedPhase.includes(statusKeyword) && !rawPhase.includes(statusKeyword)) {
        return false;
      }
    }

    return true;
  });
};
