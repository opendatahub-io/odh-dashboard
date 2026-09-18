import { K8sNameDescriptionFieldData, K8sResourceCommon } from '@odh-dashboard/k8s-core';
import {
  CreateExternalProviderRequest,
  ExternalProvider,
  ProviderTypes,
  SecretSummary,
  UpdateExternalProviderRequest,
} from '~/app/types/external-models';
import { mapAuthMechanismToHumanReadable } from '~/app/pages/external-models/utils';
import { normalizePhase } from '~/app/utilities/phaseLabelUtils';
import {
  ConfigPair,
  configPairsToRecord,
  EMPTY_CONFIG_PAIR,
  recordToConfigPairs,
} from '~/app/utilities/configPairs';
import { CreateExternalProviderFormFields } from '~/app/pages/external-providers/createProvider/useCreateExternalProviderForm';
import { ExternalProvidersFilterDataType, ExternalProvidersFilterOptions } from './const';

export { configPairsToRecord };

export const getSecretDisplayLabel = (
  secret: Pick<SecretSummary, 'name' | 'displayName'>,
): string => secret.displayName?.trim() || secret.name;

export const formatMissingCredentialSecretLabel = (secretName: string): string =>
  `${secretName} (not found)`;

export const getMissingCredentialSecretRef = (
  credentialSecretRef: string,
  secrets: SecretSummary[],
  isNewSecret: boolean,
): string | undefined => {
  const trimmedRef = credentialSecretRef.trim();
  if (isNewSecret || !trimmedRef) {
    return undefined;
  }
  return secrets.some((secret) => secret.name === trimmedRef) ? undefined : trimmedRef;
};

export type OrphanedCredentialSecretContext = 'create' | 'update';

export const formatOrphanedCredentialSecretSubmitError = (
  message: string,
  secretName: string,
  context: OrphanedCredentialSecretContext,
): string => {
  const failureReason =
    context === 'create'
      ? 'the external provider could not be created'
      : 'could not be linked to this provider';

  return `${message} The credential secret "${secretName}" was created but ${failureReason}. Select it from the existing secrets list and try again.`;
};

export type ExternalProviderNameDescInitialData = {
  name: string;
  description: string;
  k8sName: string;
};

export type ExternalProviderFormState = {
  formData: CreateExternalProviderFormFields;
  configPairs: ConfigPair[];
  nameDescInitialData: ExternalProviderNameDescInitialData;
};

export const externalProviderToFormState = (
  provider: ExternalProvider,
): ExternalProviderFormState => {
  const configPairs = recordToConfigPairs(provider.config);
  return {
    formData: {
      provider: provider.provider,
      endpointUrl: provider.endpointUrl,
      authMechanism: provider.authMechanism,
      credentialSecretRef: provider.credentialSecretRef,
      isNewSecret: false,
      secretValue: '',
    },
    configPairs: configPairs.length > 0 ? configPairs : [EMPTY_CONFIG_PAIR],
    nameDescInitialData: {
      name: provider.displayName ?? provider.name,
      description: provider.description ?? '',
      k8sName: provider.name,
    },
  };
};

export const toUpdateExternalProviderRequest = (
  nameDescData: K8sNameDescriptionFieldData,
  formData: {
    provider: string;
    endpointUrl: string;
    authMechanism: UpdateExternalProviderRequest['authMechanism'];
    credentialSecretRef: string;
  },
  configPairs: ConfigPair[],
): UpdateExternalProviderRequest => ({
  displayName: nameDescData.name.trim(),
  description: nameDescData.description.trim(),
  endpointUrl: formData.endpointUrl.trim(),
  authMechanism: formData.authMechanism,
  credentialSecretRef: formData.credentialSecretRef.trim(),
  provider: formData.provider.trim(),
  config: configPairsToRecord(configPairs) ?? {},
});

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
    case 'vertex':
      return ProviderTypes.GoogleVertexAI;
    default:
      return '-';
  }
};
