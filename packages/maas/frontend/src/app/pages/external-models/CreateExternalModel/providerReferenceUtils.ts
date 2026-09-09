import { ExternalProvider, ProviderRef } from '~/app/types/external-models';
import { ConfigPair } from './ModelConfigPairsEditor';

export const PROVIDER_REFERENCE_API_FORMATS = {
  'openai-chat': {
    label: 'OpenAI Chat',
    defaultPath: '/v1/chat/completions',
    pathHelper: 'Pre-filled with /v1/chat/completions — the standard OpenAI Chat Completions path.',
  },
  messages: {
    label: 'Anthropic Messages',
    defaultPath: '/v1/messages',
    pathHelper:
      'Pre-filled with /v1/messages — the Anthropic Messages API path. Auth uses the x-api-key header, not Bearer.',
  },
} as const;

export type ProviderReferenceApiFormat = keyof typeof PROVIDER_REFERENCE_API_FORMATS;

export const PROVIDER_REFERENCE_API_FORMAT_OPTIONS = Object.entries(
  PROVIDER_REFERENCE_API_FORMATS,
).map(([key, value]) => ({
  key,
  label: value.label,
}));

export const isProviderReferenceApiFormat = (value: string): value is ProviderReferenceApiFormat =>
  value in PROVIDER_REFERENCE_API_FORMATS;

export const getApiFormatLabel = (apiFormat: string): string =>
  isProviderReferenceApiFormat(apiFormat)
    ? PROVIDER_REFERENCE_API_FORMATS[apiFormat].label
    : apiFormat;

export const getProviderRefWeightPercentage = (
  providerRefs: ProviderRef[],
  index: number,
): number => {
  const totalWeight = providerRefs.reduce((sum, ref) => sum + ref.weight, 0);
  if (totalWeight <= 0) {
    return 0;
  }
  return Math.round((providerRefs[index].weight / totalWeight) * 100);
};

const isExactWeightPercentage = (weight: number, totalWeight: number): boolean =>
  (weight * 100) % totalWeight === 0;

export const formatProviderRefWeightPercentage = (
  providerRefs: ProviderRef[],
  index: number,
): string => {
  const totalWeight = providerRefs.reduce((sum, ref) => sum + ref.weight, 0);
  if (totalWeight <= 0) {
    return '0%';
  }

  const { weight } = providerRefs[index];
  const percentage = getProviderRefWeightPercentage(providerRefs, index);
  const prefix = isExactWeightPercentage(weight, totalWeight) ? '' : '≈ ';

  return `${prefix}${percentage}%`;
};

export const recordToConfigPairs = (config?: Record<string, string>): ConfigPair[] =>
  config ? Object.entries(config).map(([key, value]) => ({ key, value })) : [];

export const getProviderDisplayName = (providerName: string, provider?: ExternalProvider): string =>
  provider?.displayName ?? providerName;
