import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { isGenerativeNonLegacy, isLLMInferenceServiceActive } from '../formUtils';
import { LLMD_OPTION } from '../deployments/server';

describe('isLLMInferenceServiceActive', () => {
  it('returns true when the llm-d option is selected by name', () => {
    expect(
      isLLMInferenceServiceActive({
        modelServer: { data: { selection: { name: LLMD_OPTION.name } } },
      }),
    ).toBe(true);
  });

  it('returns true when an LLMInferenceServiceConfig template is selected', () => {
    expect(
      isLLMInferenceServiceActive({
        modelServer: { data: { selection: { template: { kind: 'LLMInferenceServiceConfig' } } } },
      }),
    ).toBe(true);
  });

  it('returns true when the existing model resource is an LLMInferenceService', () => {
    expect(
      isLLMInferenceServiceActive({}, { model: { kind: 'LLMInferenceService' } as never }),
    ).toBe(true);
  });

  it('returns false when a different serving runtime is selected', () => {
    expect(
      isLLMInferenceServiceActive({
        modelServer: { data: { selection: { name: 'other-runtime' } } },
      }),
    ).toBe(false);
  });

  it('returns false when no model server selection or resource is provided', () => {
    expect(isLLMInferenceServiceActive({})).toBe(false);
  });
});

describe('isGenerativeNonLegacy', () => {
  it('returns true for GENERATIVE model type with legacyVLLM false', () => {
    expect(
      isGenerativeNonLegacy({
        modelType: { data: { type: ServingRuntimeModelType.GENERATIVE, legacyVLLM: false } },
      }),
    ).toBe(true);
  });

  it('returns false for GENERATIVE model type with legacyVLLM true', () => {
    expect(
      isGenerativeNonLegacy({
        modelType: { data: { type: ServingRuntimeModelType.GENERATIVE, legacyVLLM: true } },
      }),
    ).toBe(false);
  });

  it('returns false for PREDICTIVE model type', () => {
    expect(
      isGenerativeNonLegacy({ modelType: { data: { type: ServingRuntimeModelType.PREDICTIVE } } }),
    ).toBe(false);
  });

  it('returns false when modelType is not set', () => {
    expect(isGenerativeNonLegacy({})).toBe(false);
  });
});
