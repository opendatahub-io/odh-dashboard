import { testHook } from '@odh-dashboard/jest-config/hooks';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { useWizardTrackingProperties } from '../useWizardTrackingProperties';
import type { WizardFormData } from '../../types/form-data';

jest.mock('@odh-dashboard/plugin-core');

const mockUseResolvedExtensions = jest.mocked(useResolvedExtensions);

const mockWizardState = {
  project: { projectName: 'test-project' },
  modelType: { data: { type: 'single' } },
  modelFormatState: { selectedFormat: { name: 'onnx' } },
  numReplicas: { data: 2 },
  modelServer: { data: { selection: { name: 'ovms-template', label: 'OVMS' } } },
} as unknown as WizardFormData['state'];

describe('useWizardTrackingProperties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty properties when no platformId is provided', () => {
    mockUseResolvedExtensions.mockReturnValue([[], true, []]);

    const renderResult = testHook(useWizardTrackingProperties)(mockWizardState, undefined);
    expect(renderResult.result.current.platformProperties).toEqual({});
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should return empty properties when extensions are not loaded', () => {
    mockUseResolvedExtensions.mockReturnValue([[], false, []]);

    const renderResult = testHook(useWizardTrackingProperties)(mockWizardState, 'kserve');
    expect(renderResult.result.current.platformProperties).toEqual({});
    expect(renderResult.result.current.loaded).toBe(false);
  });

  it('should return empty properties when no extension matches the platform', () => {
    mockUseResolvedExtensions.mockReturnValue([
      [
        {
          type: 'model-serving.deployment/tracking-properties',
          properties: {
            platform: 'nvidia-nim',
            getProperties: () => ({ nimModelId: 'test-model' }),
          },
        },
      ] as never,
      true,
      [],
    ]);

    const renderResult = testHook(useWizardTrackingProperties)(mockWizardState, 'kserve');
    expect(renderResult.result.current.platformProperties).toEqual({});
  });

  it('should return platform properties when extension matches', () => {
    const mockGetProperties = jest.fn().mockReturnValue({
      nimModelId: 'meta/llama3-8b',
      nimImageVersion: '1.0.0',
    });

    mockUseResolvedExtensions.mockReturnValue([
      [
        {
          type: 'model-serving.deployment/tracking-properties',
          properties: {
            platform: 'nvidia-nim',
            getProperties: mockGetProperties,
          },
        },
      ] as never,
      true,
      [],
    ]);

    const renderResult = testHook(useWizardTrackingProperties)(mockWizardState, 'nvidia-nim');

    expect(renderResult.result.current.platformProperties).toEqual({
      nimModelId: 'meta/llama3-8b',
      nimImageVersion: '1.0.0',
    });
    expect(mockGetProperties).toHaveBeenCalledWith(mockWizardState);
  });

  it('should only use the first matching extension for the platform', () => {
    mockUseResolvedExtensions.mockReturnValue([
      [
        {
          type: 'model-serving.deployment/tracking-properties',
          properties: {
            platform: 'kserve',
            getProperties: () => ({ kserveProperty: 'first' }),
          },
        },
        {
          type: 'model-serving.deployment/tracking-properties',
          properties: {
            platform: 'kserve',
            getProperties: () => ({ kserveProperty: 'second' }),
          },
        },
      ] as never,
      true,
      [],
    ]);

    const renderResult = testHook(useWizardTrackingProperties)(mockWizardState, 'kserve');
    expect(renderResult.result.current.platformProperties).toEqual({
      kserveProperty: 'first',
    });
  });
});
