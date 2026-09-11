import { K8sNameDescriptionFieldData, K8sResourceCommon } from '@odh-dashboard/k8s-core';
import {
  CreateExternalProviderRequest,
  ExternalProvider,
  ProviderTypes,
  SecretSummary,
} from '~/app/types/external-models';
import { mapAuthMechanismToHumanReadable } from '~/app/pages/external-models/utils';
import { normalizePhase } from '~/app/utilities/phaseLabelUtils';
import { ExternalProvidersFilterDataType, ExternalProvidersFilterOptions } from './const';
import { ConfigPair } from './types';

export const getSecretDisplayLabel = (
  secret: Pick<SecretSummary, 'name' | 'displayName'>,
): string => secret.displayName?.trim() || secret.name;

export const configPairsToRecord = (pairs: ConfigPair[]): Record<string, string> | undefined => {
  const config = pairs.reduce<Record<string, string>>((acc, { key, value }) => {
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();
    if (!trimmedKey || !trimmedValue) {
      return acc;
    }
    acc[trimmedKey] = trimmedValue;
    return acc;
  }, {});

  return Object.keys(config).length > 0 ? config : undefined;
};

export const toCreateExternalProviderRequest = (
  namespace: string,
  nameDescData: K8sNameDescriptionFieldData,
  formData: {
    provider: string;
    endpointUrl: string;
    authMechanism: CreateExternalProviderRequest['authMechanism'];
    credentialSecretRef: string;
  },
  configPairs: ConfigPair[],
): CreateExternalProviderRequest => ({
  name: nameDescData.k8sName.value,
  namespace,
  displayName: nameDescData.name.trim() || undefined,
  description: nameDescData.description.trim() || undefined,
  endpointUrl: formData.endpointUrl.trim(),
  authMechanism: formData.authMechanism,
  credentialSecretRef: formData.credentialSecretRef.trim(),
  provider: formData.provider,
  config: configPairsToRecord(configPairs),
});

export const getExternalProviderResource = (provider: ExternalProvider): K8sResourceCommon => ({
  apiVersion: 'maas.opendatahub.io/v1alpha1',
  kind: 'ExternalProvider',
  metadata: {
    name: provider.name,
    namespace: provider.namespace,
  },
});

export const hasActiveExternalProvidersFilters = (
  filterData: ExternalProvidersFilterDataType,
): boolean =>
  !!filterData[ExternalProvidersFilterOptions.name].trim() ||
  filterData[ExternalProvidersFilterOptions.providerType].length > 0 ||
  filterData[ExternalProvidersFilterOptions.authentication].length > 0 ||
  filterData[ExternalProvidersFilterOptions.status].length > 0;

export const filterExternalProviders = (
  providers: ExternalProvider[],
  filterData: ExternalProvidersFilterDataType,
): ExternalProvider[] => {
  const nameKeyword = filterData[ExternalProvidersFilterOptions.name].trim().toLowerCase();
  const providerTypes = filterData[ExternalProvidersFilterOptions.providerType];
  const authentications = filterData[ExternalProvidersFilterOptions.authentication];
  const statuses = filterData[ExternalProvidersFilterOptions.status];

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

    if (providerTypes.length > 0) {
      const providerValue = provider.provider.toLowerCase();
      const matchesProviderType = providerTypes.some(
        (providerType) =>
          providerValue === providerType || providerValue.includes(providerType.toLowerCase()),
      );
      if (!matchesProviderType) {
        return false;
      }
    }

    if (authentications.length > 0) {
      const authLabel = mapAuthMechanismToHumanReadable(provider.authMechanism).toLowerCase();
      const authValue = provider.authMechanism.toLowerCase();
      const matchesAuth = authentications.some(
        (authentication) =>
          authLabel.includes(authentication.toLowerCase()) ||
          authValue.includes(authentication.toLowerCase()),
      );
      if (!matchesAuth) {
        return false;
      }
    }

    if (statuses.length > 0) {
      const normalizedPhase = normalizePhase(provider.phase).toLowerCase();
      const rawPhase = (provider.phase ?? '').toLowerCase();
      const matchesStatus = statuses.some(
        (status) =>
          normalizedPhase.includes(status.toLowerCase()) || rawPhase.includes(status.toLowerCase()),
      );
      if (!matchesStatus) {
        return false;
      }
    }

    return true;
  });
};

export const convertStringToProviderType = (providerType: string): ProviderTypes | string => {
  switch (providerType) {
    case 'openai':
      return ProviderTypes.OpenAI;
    case 'anthropic':
      return ProviderTypes.Anthropic;
    case 'aws-bedrock':
      return ProviderTypes.AWSBedrock;
    case 'azure':
      return ProviderTypes.Azure;
    case 'google-vertex-ai':
      return ProviderTypes.GoogleVertexAI;
    default:
      return '-';
  }
};
