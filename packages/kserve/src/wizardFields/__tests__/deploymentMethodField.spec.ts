import {
  legacyDeploymentMethodOverride,
  LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY,
} from '../deploymentMethodField';

describe('legacyDeploymentMethodOverride', () => {
  it('should have id "deploymentMethod"', () => {
    expect(legacyDeploymentMethodOverride.id).toBe('deploymentMethod');
  });

  it('should always be active', () => {
    expect(legacyDeploymentMethodOverride.isActive({})).toBe(true);
  });

  it('should expose the legacy option with order 3', () => {
    expect(legacyDeploymentMethodOverride.options).toHaveLength(1);
    expect(legacyDeploymentMethodOverride.options[0].key).toBe(
      LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY,
    );
    expect(legacyDeploymentMethodOverride.options[0].order).toBe(3);
  });

  describe('suggestion', () => {
    it('should suggest legacy when isLLMdDefault is false', () => {
      const result = legacyDeploymentMethodOverride.suggestion?.({ isLLMdDefault: false });
      expect(result).toBeDefined();
      expect(result?.key).toBe(LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY);
    });

    it('should suggest legacy when isLLMdDefault is undefined', () => {
      const result = legacyDeploymentMethodOverride.suggestion?.({});
      expect(result).toBeDefined();
      expect(result?.key).toBe(LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY);
    });

    it('should suggest legacy when clusterSettings is null', () => {
      const result = legacyDeploymentMethodOverride.suggestion?.(null);
      expect(result).toBeDefined();
      expect(result?.key).toBe(LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY);
    });

    it('should suggest legacy when clusterSettings is undefined', () => {
      const result = legacyDeploymentMethodOverride.suggestion?.(undefined);
      expect(result).toBeDefined();
      expect(result?.key).toBe(LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY);
    });

    it('should not suggest legacy when isLLMdDefault is true', () => {
      const result = legacyDeploymentMethodOverride.suggestion?.({ isLLMdDefault: true });
      expect(result).toBeUndefined();
    });
  });
});
