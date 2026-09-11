import { ExternalProvider, ProviderRef } from '~/app/types/external-models';
import { ConfigPair } from './ModelConfigPairsEditor';

/** Matches CRD maxLength for spec.modelName and spec.externalProviderRefs[].targetModel. */
export const EXTERNAL_MODEL_FIELD_MAX_LENGTH = 253;

/** Matches CRD maxLength for spec.externalProviderRefs[].path. */
export const PROVIDER_REFERENCE_PATH_MAX_LENGTH = 512;

const PROVIDER_REFERENCE_PATH_PATTERN = /^\/.*/;

export const getUtf8ByteLength = (value: string): number => new TextEncoder().encode(value).length;

export const hasControlCharacters = (value: string): boolean =>
  [...value].some((char) => {
    const code = char.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });

export const validateExternalModelFieldLength = (
  value: string,
  fieldLabel: string,
): string | undefined => {
  if (getUtf8ByteLength(value) > EXTERNAL_MODEL_FIELD_MAX_LENGTH) {
    return `${fieldLabel} cannot exceed ${EXTERNAL_MODEL_FIELD_MAX_LENGTH} bytes`;
  }
  if (hasControlCharacters(value)) {
    return `${fieldLabel} cannot contain control characters or newlines`;
  }
  return undefined;
};

export const validateProviderReferencePath = (value: string): string | undefined => {
  const trimmedPath = value.trim();
  if (!trimmedPath) {
    return 'Path is required';
  }
  if (!PROVIDER_REFERENCE_PATH_PATTERN.test(trimmedPath)) {
    return 'Path must start with /';
  }
  if (getUtf8ByteLength(trimmedPath) > PROVIDER_REFERENCE_PATH_MAX_LENGTH) {
    return `Path cannot exceed ${PROVIDER_REFERENCE_PATH_MAX_LENGTH} bytes`;
  }
  if (hasControlCharacters(trimmedPath)) {
    return 'Path cannot contain control characters or newlines';
  }
  return undefined;
};

/** Resolved automatically from Target model ID; not required in provider/model config. */
export const PROVIDER_REFERENCE_PATH_MODEL_PLACEHOLDER = 'model';

const PATH_PLACEHOLDER_PATTERN = /\{([^{}]+)\}/g;

export const extractPathPlaceholders = (path: string): string[] => {
  const placeholders = [...path.matchAll(PATH_PLACEHOLDER_PATTERN)]
    .map((match) => match[1].trim())
    .filter(Boolean);

  return [...new Set(placeholders)];
};

export const mergeProviderReferenceConfig = (
  configPairs: ConfigPair[],
  inheritedConfig?: Record<string, string>,
): Record<string, string> => {
  const merged = { ...(inheritedConfig ?? {}) };
  configPairs.forEach((pair) => {
    const key = pair.key.trim();
    if (key) {
      merged[key] = pair.value;
    }
  });
  return merged;
};

export const getMissingPathPlaceholders = (
  path: string,
  config: Record<string, string>,
): string[] =>
  extractPathPlaceholders(path).filter(
    (placeholder) =>
      placeholder !== PROVIDER_REFERENCE_PATH_MODEL_PLACEHOLDER && !(placeholder in config),
  );

export const formatMissingPathPlaceholderError = (missingPlaceholders: string[]): string => {
  const formattedPlaceholders = missingPlaceholders.map((key) => `{${key}}`).join(', ');
  return `Missing values for: ${formattedPlaceholders}. Set them in Advanced settings under Model configuration, or on the provider.`;
};

export const validateProviderReferencePathPlaceholders = (
  path: string,
  inheritedConfig?: Record<string, string>,
  configPairs: ConfigPair[] = [],
): string | undefined => {
  const trimmedPath = path.trim();
  if (!trimmedPath) {
    return undefined;
  }

  const mergedConfig = mergeProviderReferenceConfig(configPairs, inheritedConfig);
  const missingPlaceholders = getMissingPathPlaceholders(trimmedPath, mergedConfig);
  if (missingPlaceholders.length === 0) {
    return undefined;
  }

  return formatMissingPathPlaceholderError(missingPlaceholders);
};

export const validateProviderRefPathPlaceholders = (
  path: string,
  inheritedConfig?: Record<string, string>,
  modelConfig?: Record<string, string>,
): string | undefined =>
  validateProviderReferencePathPlaceholders(
    path,
    inheritedConfig,
    recordToConfigPairs(modelConfig),
  );

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

export const getProviderRefsTotalWeight = (providerRefs: ProviderRef[]): number =>
  providerRefs.reduce((sum, ref) => sum + ref.weight, 0);

export const hasZeroTotalProviderRefWeight = (providerRefs: ProviderRef[]): boolean =>
  providerRefs.length > 0 && getProviderRefsTotalWeight(providerRefs) === 0;

export const PROVIDER_REFS_ZERO_TOTAL_WEIGHT_MESSAGE =
  'Total weight is 0. At least one provider reference must have a weight greater than 0.';

export const DISTRIBUTE_EQUALLY_POPOVER_CONTENT =
  'Resets all provider reference weights to 1, giving each provider an equal share of traffic. You can adjust individual weights afterwards.';

export const setProviderRefWeightsEqually = (providerRefs: ProviderRef[]): ProviderRef[] =>
  providerRefs.map((ref) => ({ ...ref, weight: 1 }));

export const isProviderRefExcludedFromRouting = (
  providerRefs: ProviderRef[],
  index: number,
): boolean => providerRefs[index].weight === 0;

export const formatProviderRefWeightPercentage = (
  providerRefs: ProviderRef[],
  index: number,
): string => {
  const { weight } = providerRefs[index];
  if (weight === 0) {
    return 'Excluded from routing';
  }

  const totalWeight = providerRefs.reduce((sum, ref) => sum + ref.weight, 0);
  if (totalWeight <= 0) {
    return 'Excluded from routing';
  }

  const percentage = getProviderRefWeightPercentage(providerRefs, index);
  const prefix = isExactWeightPercentage(weight, totalWeight) ? '' : '≈ ';

  return `${prefix}${percentage}%`;
};

export const recordToConfigPairs = (config?: Record<string, string>): ConfigPair[] =>
  config ? Object.entries(config).map(([key, value]) => ({ key, value })) : [];

export const getProviderDisplayName = (providerName: string, provider?: ExternalProvider): string =>
  provider?.displayName ?? providerName;
