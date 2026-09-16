import { ExternalProvider, ProviderRef } from '~/app/types/external-models';
import { ConfigPair, recordToConfigPairs } from '~/app/utilities/configPairs';
import { PROVIDER_REFERENCE_API_FORMATS, ProviderReferenceApiFormat } from './const';

export { recordToConfigPairs };
export type { ConfigPair };

export type { ProviderReferenceApiFormat };

export const isProviderReferenceApiFormat = (value: string): value is ProviderReferenceApiFormat =>
  Object.prototype.hasOwnProperty.call(PROVIDER_REFERENCE_API_FORMATS, value);

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

export const getProviderDisplayName = (providerName: string, provider?: ExternalProvider): string =>
  provider?.displayName ?? providerName;
