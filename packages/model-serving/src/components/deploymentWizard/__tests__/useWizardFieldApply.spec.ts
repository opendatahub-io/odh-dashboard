import { renderHook } from '@testing-library/react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { mockDeploymentWizardState } from '../../../__tests__/mockUtils';
import { useWizardFieldApply } from '../useWizardFieldApply';
import type { Deployment } from '../../../../extension-points';

jest.mock('@odh-dashboard/plugin-core');

describe('useWizardFieldApply readiness', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])('should report readiness for apply=%s and fields=%s', (applyLoaded, fieldsLoaded) => {
    jest.mocked(useResolvedExtensions).mockReturnValueOnce([[], applyLoaded, []]);
    jest.mocked(useResolvedExtensions).mockReturnValueOnce([[], fieldsLoaded, []]);
    const { result } = renderHook(() => useWizardFieldApply(mockDeploymentWizardState().state));
    expect(result.current.applyExtensionsLoaded).toBe(applyLoaded && fieldsLoaded);
  });

  it('should apply field data when field extensions finish resolving', () => {
    const apply = jest.fn((deployment: Deployment) => deployment);
    const applyExtension = {
      pluginName: 'test',
      uid: 'apply-test',
      type: 'model-serving.deployment/wizard-field-apply',
      properties: { fieldId: 'runtimeArgs', platform: 'test', apply },
    };
    const fieldExtension = {
      pluginName: 'test',
      uid: 'field-test',
      type: 'model-serving.deployment/wizard-field',
      properties: {
        field: { id: 'runtimeArgs', isActive: () => true, reducerFunctions: {} },
      },
    };
    const { state } = mockDeploymentWizardState();
    jest.mocked(useResolvedExtensions).mockReturnValueOnce([[applyExtension], true, []]);
    jest.mocked(useResolvedExtensions).mockReturnValueOnce([[], false, []]);
    const { result, rerender } = renderHook(() => useWizardFieldApply(state));
    expect(result.current.applyExtensionsLoaded).toBe(false);

    jest.mocked(useResolvedExtensions).mockReturnValueOnce([[applyExtension], true, []]);
    jest.mocked(useResolvedExtensions).mockReturnValueOnce([[fieldExtension], true, []]);
    rerender();
    expect(result.current.applyExtensionsLoaded).toBe(true);
    const deployment: Deployment = {
      modelServingPlatformId: 'test',
      model: {
        kind: 'LLMInferenceService',
        apiVersion: 'serving.kserve.io/v1alpha2',
        metadata: { name: 'test-model', namespace: 'test-project' },
      },
    };
    result.current.applyAllFieldDataFn(deployment);
    expect(apply).toHaveBeenCalledWith(deployment, state.runtimeArgs, state);
  });
});
