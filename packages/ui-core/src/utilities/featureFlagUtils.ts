/** Prefixes for flags whose true value disables or hides the related feature. */
export const INVERTED_FEATURE_FLAG_PREFIXES = ['disable', 'hide'] as const;

const invertedFeatureFlagPattern = new RegExp(
  `^(?:${INVERTED_FEATURE_FLAG_PREFIXES.join('|')})[A-Z]`,
);

export const isInvertedFeatureFlag = (flagName: string): boolean =>
  invertedFeatureFlagPattern.test(flagName);

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

  if (matchingFlags.length > 1) {
    console.warn(
      `Ignoring ambiguous feature flag shorthand "${featureName}": ${matchingFlags.join(', ')}.`,
    );
  }

  return matchingFlags.length === 1 ? matchingFlags[0] : undefined;
};
