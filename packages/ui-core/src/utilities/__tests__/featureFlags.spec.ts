import {
  getInvertedFeatureFlagName,
  INVERTED_FEATURE_FLAG_PREFIXES,
  isFeatureFlagEnabled,
  isInvertedFeatureFlag,
} from '../featureFlagUtils';

describe('feature flag utilities', () => {
  it('should identify every supported inverted prefix', () => {
    INVERTED_FEATURE_FLAG_PREFIXES.forEach((prefix) => {
      expect(isInvertedFeatureFlag(`${prefix}Example`)).toBe(true);
    });

    expect(isInvertedFeatureFlag('example')).toBe(false);
  });

  it('should evaluate enabled state for regular and inverted flags', () => {
    expect(isFeatureFlagEnabled('example', true)).toBe(true);
    expect(isFeatureFlagEnabled('example', false)).toBe(false);
    expect(isFeatureFlagEnabled('disableExample', false)).toBe(true);
    expect(isFeatureFlagEnabled('disableExample', true)).toBe(false);
    expect(isFeatureFlagEnabled('hideExample', false)).toBe(true);
    expect(isFeatureFlagEnabled('hideExample', true)).toBe(false);
  });

  it('should resolve a supported inverted flag name from a feature shorthand', () => {
    expect(getInvertedFeatureFlagName('example', ['disableExample'])).toBe('disableExample');
    expect(getInvertedFeatureFlagName('example', ['hideExample'])).toBe('hideExample');
    expect(getInvertedFeatureFlagName('example', ['otherExample'])).toBeUndefined();
    expect(
      getInvertedFeatureFlagName('example', ['disableExample', 'hideExample']),
    ).toBeUndefined();
  });
});
