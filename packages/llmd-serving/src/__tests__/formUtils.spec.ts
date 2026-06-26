import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { isSimpleLLMInferenceService, isLLMInferenceServiceActive } from '../formUtils';
import {
  LLMD_DEPLOYMENT_METHOD_KEY,
  SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY,
} from '../wizardFields/deploymentMethodField';

describe('isLLMInferenceServiceActive', () => {
  it('returns true when the simple vLLM deployment method is selected', () => {
    expect(
      isLLMInferenceServiceActive({
        deploymentMethod: { method: SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY },
      }),
    ).toBe(true);
  });

  it('returns true when the llm-d deployment method is selected', () => {
    expect(
      isLLMInferenceServiceActive({
        deploymentMethod: { method: LLMD_DEPLOYMENT_METHOD_KEY },
      }),
    ).toBe(true);
  });

  it('returns true when the existing model resource is an LLMInferenceService', () => {
    expect(
      isLLMInferenceServiceActive({}, { model: { kind: 'LLMInferenceService' } as never }),
    ).toBe(true);
  });

  it('returns false when a different deployment method is selected', () => {
    expect(
      isLLMInferenceServiceActive({
        deploymentMethod: { method: 'other-method' },
      }),
    ).toBe(false);
  });

  it('returns false when no deployment method or resource is provided', () => {
    expect(isLLMInferenceServiceActive({})).toBe(false);
  });
});

describe('isSimpleLLMInferenceService', () => {
  it('returns true for GENERATIVE model type with simple vLLM deployment method and vLLMDeploymentOnMaaS enabled', () => {
    expect(
      isSimpleLLMInferenceService({
        modelType: { data: { type: ServingRuntimeModelType.GENERATIVE } },
        deploymentMethod: { method: SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY },
        devFeatureFlags: { vLLMDeploymentOnMaaS: true },
      }),
    ).toBe(true);
  });

  it('returns false for GENERATIVE model type with simple vLLM deployment method when vLLMDeploymentOnMaaS is disabled', () => {
    expect(
      isSimpleLLMInferenceService({
        modelType: { data: { type: ServingRuntimeModelType.GENERATIVE } },
        deploymentMethod: { method: SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY },
        devFeatureFlags: { vLLMDeploymentOnMaaS: false },
      }),
    ).toBe(false);
  });

  it('returns false for GENERATIVE model type with llm-d deployment method', () => {
    expect(
      isSimpleLLMInferenceService({
        modelType: { data: { type: ServingRuntimeModelType.GENERATIVE } },
        deploymentMethod: { method: LLMD_DEPLOYMENT_METHOD_KEY },
        devFeatureFlags: { vLLMDeploymentOnMaaS: true },
      }),
    ).toBe(false);
  });

  it('returns false for PREDICTIVE model type', () => {
    expect(
      isSimpleLLMInferenceService({
        modelType: { data: { type: ServingRuntimeModelType.PREDICTIVE } },
        deploymentMethod: { method: SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY },
        devFeatureFlags: { vLLMDeploymentOnMaaS: true },
      }),
    ).toBe(false);
  });

  it('returns false when modelType is not set', () => {
    expect(isSimpleLLMInferenceService({})).toBe(false);
  });
});
