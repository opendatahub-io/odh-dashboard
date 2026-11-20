/** Prefixes for flags whose true value disables or hides the related feature. */
export const INVERTED_FEATURE_FLAG_PREFIXES = ['disable', 'hide'] as const;

export const isInvertedFeatureFlag = (flagName: string): boolean =>
  INVERTED_FEATURE_FLAG_PREFIXES.some((prefix) => flagName.startsWith(prefix));

export const isFeatureFlagEnabled = (flagName: string, value: boolean): boolean =>
  isInvertedFeatureFlag(flagName) ? !value : value;

export const getInvertedFeatureFlagName = (
  featureName: string,
  availableFlags: readonly string[],
): string | undefined => {
  const capitalizedFeatureName = featureName.charAt(0).toUpperCase() + featureName.slice(1);
  const matchingFlags = INVERTED_FEATURE_FLAG_PREFIXES.map(
    (prefix) => `${prefix}${capitalizedFeatureName}`,
  ).filter((flagName) => availableFlags.includes(flagName));

  return matchingFlags.length === 1 ? matchingFlags[0] : undefined;
};
