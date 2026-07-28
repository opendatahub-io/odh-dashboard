import type { RecursivePartial } from '@odh-dashboard/foundation';
import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import {
  vllmDeploymentMethodOverride,
  llmdDeploymentMethodOverride,
  SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY,
  LLMD_DEPLOYMENT_METHOD_KEY,
} from '../deploymentMethodField';

const mockWizardState: RecursivePartial<WizardFormData['state']> = {};

describe('vllmDeploymentMethodOverride', () => {
  it('should have id "deploymentMethod"', () => {
    expect(vllmDeploymentMethodOverride.id).toBe('deploymentMethod');
  });

  it('should always be active', () => {
    expect(vllmDeploymentMethodOverride.isActive(mockWizardState)).toBe(true);
  });

  it('should expose the simple vLLM option', () => {
    expect(vllmDeploymentMethodOverride.options).toHaveLength(1);
    expect(vllmDeploymentMethodOverride.options[0].key).toBe(SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY);
  });

  describe('suggestion', () => {
    it('should suggest simple vLLM when isLLMdDefault is false', () => {
      const result = vllmDeploymentMethodOverride.suggestion?.({ isLLMdDefault: false });
      expect(result).toBeDefined();
      expect(result?.key).toBe(SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY);
    });

    it('should suggest simple vLLM when isLLMdDefault is undefined', () => {
      const result = vllmDeploymentMethodOverride.suggestion?.({});
      expect(result).toBeDefined();
      expect(result?.key).toBe(SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY);
    });

    it('should suggest simple vLLM when clusterSettings is null', () => {
      const result = vllmDeploymentMethodOverride.suggestion?.(null);
      expect(result).toBeDefined();
      expect(result?.key).toBe(SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY);
    });

    it('should suggest simple vLLM when clusterSettings is undefined', () => {
      const result = vllmDeploymentMethodOverride.suggestion?.(undefined);
      expect(result).toBeDefined();
      expect(result?.key).toBe(SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY);
    });

    it('should not suggest simple vLLM when isLLMdDefault is true', () => {
      const result = vllmDeploymentMethodOverride.suggestion?.({ isLLMdDefault: true });
      expect(result).toBeUndefined();
    });
  });
});

describe('llmdDeploymentMethodOverride', () => {
  it('should have id "deploymentMethod"', () => {
    expect(llmdDeploymentMethodOverride.id).toBe('deploymentMethod');
  });

  it('should always be active', () => {
    expect(llmdDeploymentMethodOverride.isActive(mockWizardState)).toBe(true);
  });

  it('should expose the llm-d option', () => {
    expect(llmdDeploymentMethodOverride.options).toHaveLength(1);
    expect(llmdDeploymentMethodOverride.options[0].key).toBe(LLMD_DEPLOYMENT_METHOD_KEY);
  });

  describe('suggestion', () => {
    it('should suggest llm-d when isLLMdDefault is true', () => {
      const result = llmdDeploymentMethodOverride.suggestion?.({ isLLMdDefault: true });
      expect(result).toBeDefined();
      expect(result?.key).toBe(LLMD_DEPLOYMENT_METHOD_KEY);
    });

    it('should not suggest llm-d when isLLMdDefault is false', () => {
      const result = llmdDeploymentMethodOverride.suggestion?.({ isLLMdDefault: false });
      expect(result).toBeUndefined();
    });

    it('should not suggest llm-d when clusterSettings is null', () => {
      const result = llmdDeploymentMethodOverride.suggestion?.(null);
      expect(result).toBeUndefined();
    });

    it('should not suggest llm-d when clusterSettings is undefined', () => {
      const result = llmdDeploymentMethodOverride.suggestion?.(undefined);
      expect(result).toBeUndefined();
    });
  });
});
