import { testHook } from '@odh-dashboard/jest-config/hooks';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { useWizardTrackingProperties } from '../useWizardTrackingProperties';
import type { WizardFormData } from '../../types/form-data';

jest.mock('@odh-dashboard/plugin-core');

const mockUseExtensions = jest.mocked(useExtensions);

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

  it('should return empty properties when no platformId is provided', async () => {
    mockUseExtensions.mockReturnValue([]);

    const renderResult = testHook(useWizardTrackingProperties)(mockWizardState, undefined);
    const result = await renderResult.result.current.getTrackingProperties();
    expect(result).toEqual({});
  });

  it('should return empty properties when no extension matches the platform', async () => {
    mockUseExtensions.mockReturnValue([
      {
        type: 'model-serving.deployment/tracking-properties',
        properties: {
          platform: 'nvidia-nim',
          getProperties: () => Promise.resolve(() => ({ nimModelId: 'test-model' })),
        },
      },
    ] as never);

    const renderResult = testHook(useWizardTrackingProperties)(mockWizardState, 'kserve');
    const result = await renderResult.result.current.getTrackingProperties();
    expect(result).toEqual({});
  });

  it('should resolve CodeRef and return platform properties when extension matches', async () => {
    const mockGetProperties = jest.fn().mockReturnValue({
      nimModelId: 'meta/llama3-8b',
      nimImageVersion: '1.0.0',
    });

    mockUseExtensions.mockReturnValue([
      {
        type: 'model-serving.deployment/tracking-properties',
        properties: {
          platform: 'nvidia-nim',
          getProperties: () => Promise.resolve(mockGetProperties),
        },
      },
    ] as never);

    const renderResult = testHook(useWizardTrackingProperties)(mockWizardState, 'nvidia-nim');
    const result = await renderResult.result.current.getTrackingProperties();

    expect(result).toEqual({
      nimModelId: 'meta/llama3-8b',
      nimImageVersion: '1.0.0',
    });
    expect(mockGetProperties).toHaveBeenCalledWith(mockWizardState);
  });

  it('should only use the first matching extension for the platform', async () => {
    mockUseExtensions.mockReturnValue([
      {
        type: 'model-serving.deployment/tracking-properties',
        properties: {
          platform: 'kserve',
          getProperties: () => Promise.resolve(() => ({ kserveProperty: 'first' })),
        },
      },
      {
        type: 'model-serving.deployment/tracking-properties',
        properties: {
          platform: 'kserve',
          getProperties: () => Promise.resolve(() => ({ kserveProperty: 'second' })),
        },
      },
    ] as never);

    const renderResult = testHook(useWizardTrackingProperties)(mockWizardState, 'kserve');
    const result = await renderResult.result.current.getTrackingProperties();
    expect(result).toEqual({
      kserveProperty: 'first',
    });
  });

  it('should return empty properties when CodeRef resolution throws', async () => {
    mockUseExtensions.mockReturnValue([
      {
        type: 'model-serving.deployment/tracking-properties',
        properties: {
          platform: 'nvidia-nim',
          getProperties: () => Promise.reject(new Error('CodeRef load failed')),
        },
      },
    ] as never);

    const renderResult = testHook(useWizardTrackingProperties)(mockWizardState, 'nvidia-nim');
    const result = await renderResult.result.current.getTrackingProperties();
    expect(result).toEqual({});
  });

  it('should return empty properties when resolved function throws', async () => {
    mockUseExtensions.mockReturnValue([
      {
        type: 'model-serving.deployment/tracking-properties',
        properties: {
          platform: 'nvidia-nim',
          getProperties: () =>
            Promise.resolve(() => {
              throw new Error('getProperties execution failed');
            }),
        },
      },
    ] as never);

    const renderResult = testHook(useWizardTrackingProperties)(mockWizardState, 'nvidia-nim');
    const result = await renderResult.result.current.getTrackingProperties();
    expect(result).toEqual({});
  });
});
