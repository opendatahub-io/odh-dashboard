import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { IdentifierResourceType } from '@odh-dashboard/k8s-core';
import { ServingRuntimeModelType } from '@odh-dashboard/model-serving/shared';
import * as hostApi from '@odh-dashboard/plugin-core/host-api';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import * as llmConfigsApi from '../../api/LLMInferenceServiceConfigs';
import { useLLMConfigOptions, LLMConfigOptionsFieldWizardField } from '../LlmConfigOptionsField';
import {
  LLMD_DEPLOYMENT_METHOD_KEY,
  SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY,
} from '../deploymentMethodField';

jest.mock('@odh-dashboard/plugin-core/host-api', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/host-api'),
  useDashboardNamespace: jest.fn(),
}));
jest.mock('../../api/LLMInferenceServiceConfigs');

const mockUseDashboardNamespace = jest.mocked(hostApi.useDashboardNamespace);
const mockUseFetchLLMInferenceServiceConfigs = jest.mocked(
  llmConfigsApi.useFetchLLMInferenceServiceConfigs,
);

describe('useLLMConfigOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDashboardNamespace.mockReturnValue({ dashboardNamespace: 'opendatahub' });
    mockUseFetchLLMInferenceServiceConfigs.mockReturnValue({
      data: [],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
  });

  it('should return all configs when none are disabled', () => {
    const enabledConfig1 = mockLLMInferenceServiceConfigK8sResource({
      name: 'config-1',
      displayName: 'Config One',
    });
    const enabledConfig2 = mockLLMInferenceServiceConfigK8sResource({
      name: 'config-2',
      displayName: 'Config Two',
    });
    mockUseFetchLLMInferenceServiceConfigs.mockReturnValue({
      data: [enabledConfig1, enabledConfig2],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useLLMConfigOptions)();

    expect(renderResult.result.current.data.configs).toHaveLength(2);
    expect(renderResult.result.current.data.configs).toEqual([enabledConfig1, enabledConfig2]);
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should filter out configs with opendatahub.io/disabled annotation set to true', () => {
    const enabledConfig = mockLLMInferenceServiceConfigK8sResource({
      name: 'enabled-config',
      displayName: 'Enabled Config',
    });
    const disabledConfig = mockLLMInferenceServiceConfigK8sResource({
      name: 'disabled-config',
      displayName: 'Disabled Config',
      disabled: true,
    });
    mockUseFetchLLMInferenceServiceConfigs.mockReturnValue({
      data: [enabledConfig, disabledConfig],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useLLMConfigOptions)();

    expect(renderResult.result.current.data.configs).toHaveLength(1);
    expect(renderResult.result.current.data.configs[0].metadata.name).toBe('enabled-config');
  });

  it('should filter out all configs when all are disabled', () => {
    const disabledConfig1 = mockLLMInferenceServiceConfigK8sResource({
      name: 'disabled-1',
      disabled: true,
    });
    const disabledConfig2 = mockLLMInferenceServiceConfigK8sResource({
      name: 'disabled-2',
      disabled: true,
    });
    mockUseFetchLLMInferenceServiceConfigs.mockReturnValue({
      data: [disabledConfig1, disabledConfig2],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useLLMConfigOptions)();

    expect(renderResult.result.current.data.configs).toHaveLength(0);
  });

  it('should return empty configs when no configs exist', () => {
    const renderResult = testHook(useLLMConfigOptions)();

    expect(renderResult.result.current.data.configs).toHaveLength(0);
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should report loaded as false when configs are not loaded', () => {
    mockUseFetchLLMInferenceServiceConfigs.mockReturnValue({
      data: [],
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useLLMConfigOptions)();

    expect(renderResult.result.current.loaded).toBe(false);
  });

  it('should propagate load errors from config fetch', () => {
    const fetchError = new Error('Failed to fetch configs');
    mockUseFetchLLMInferenceServiceConfigs.mockReturnValue({
      data: [],
      loaded: false,
      error: fetchError,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useLLMConfigOptions)();

    expect(renderResult.result.current.loadError).toBe(fetchError);
  });

  it('should keep configs without any annotations', () => {
    const configNoAnnotations = mockLLMInferenceServiceConfigK8sResource({
      name: 'no-annotation-config',
    });
    mockUseFetchLLMInferenceServiceConfigs.mockReturnValue({
      data: [configNoAnnotations],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useLLMConfigOptions)();

    expect(renderResult.result.current.data.configs).toHaveLength(1);
  });
});

describe('LLMConfigOptionsFieldWizardField.isActive', () => {
  const { isActive } = LLMConfigOptionsFieldWizardField;

  it('is active for simple vLLM when vLLMDeploymentOnMaaS is enabled', () => {
    expect(
      isActive({
        modelType: { data: { type: ServingRuntimeModelType.GENERATIVE } },
        deploymentMethod: { method: SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY },
        devFeatureFlags: { vLLMDeploymentOnMaaS: true },
      }),
    ).toBe(true);
  });

  it('is inactive for llm-d (AcceleratorConfigField owns that path)', () => {
    expect(
      isActive({
        modelType: { data: { type: ServingRuntimeModelType.GENERATIVE } },
        deploymentMethod: { method: LLMD_DEPLOYMENT_METHOD_KEY },
        devFeatureFlags: { vLLMDeploymentOnMaaS: true },
      }),
    ).toBe(false);
  });

  it('is inactive when vLLMDeploymentOnMaaS is disabled', () => {
    expect(
      isActive({
        modelType: { data: { type: ServingRuntimeModelType.GENERATIVE } },
        deploymentMethod: { method: SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY },
        devFeatureFlags: { vLLMDeploymentOnMaaS: false },
      }),
    ).toBe(false);
  });
});

describe('getInitialFieldData', () => {
  const { getInitialFieldData } = LLMConfigOptionsFieldWizardField.reducerFunctions;

  it('should return existing field data when provided', () => {
    const existingData = {
      data: {
        selection: { name: 'existing', label: 'Existing' },
        autoSelect: false,
      },
    };
    const result = getInitialFieldData(existingData);
    expect(result).toBe(existingData);
  });

  it('should not auto-select a config without a hardware profile accelerator', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({
      name: 'only-config',
      displayName: 'Only Config',
      recommendedAccelerators: '["nvidia.com/gpu"]',
    });
    const result = getInitialFieldData(undefined, { configs: [config] });

    expect(result.data?.autoSelect).toBe(false);
    expect(result.data?.suggestion).toBeUndefined();
  });

  it('should not auto-select a config matching only a non-accelerator identifier', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({
      name: 'cpu-config',
      recommendedAccelerators: '["example.com/cpu"]',
    });
    const cpuProfile = mockHardwareProfile({
      identifiers: [
        {
          identifier: 'example.com/cpu',
          displayName: 'CPU',
          resourceType: IdentifierResourceType.CPU,
          defaultCount: 1,
          minCount: 1,
          maxCount: 4,
        },
      ],
    });
    const result = getInitialFieldData(
      undefined,
      { configs: [config] },
      { hardwareProfile: cpuProfile },
    );

    expect(result.data?.autoSelect).toBe(false);
    expect(result.data?.suggestion).toBeUndefined();
  });

  it('should not auto-select when the accelerator matches no config', () => {
    const gpuProfile = mockHardwareProfile({
      identifiers: [
        {
          identifier: 'nvidia.com/gpu',
          displayName: 'GPU',
          resourceType: IdentifierResourceType.ACCELERATOR,
          defaultCount: 1,
          minCount: 1,
          maxCount: 4,
        },
      ],
    });
    const result = getInitialFieldData(
      undefined,
      {
        configs: [
          mockLLMInferenceServiceConfigK8sResource({
            name: 'amd',
            recommendedAccelerators: '["amd.com/gpu"]',
          }),
          mockLLMInferenceServiceConfigK8sResource({ name: 'gaudi' }),
        ],
      },
      { hardwareProfile: gpuProfile },
    );

    expect(result.data?.autoSelect).toBe(false);
    expect(result.data?.suggestion).toBeUndefined();
  });

  it('should not auto-select multiple candidates without a hardware profile', () => {
    const result = getInitialFieldData(undefined, {
      configs: [
        mockLLMInferenceServiceConfigK8sResource({
          name: 'amd',
          recommendedAccelerators: '["amd.com/gpu"]',
        }),
        mockLLMInferenceServiceConfigK8sResource({
          name: 'nvidia',
          recommendedAccelerators: '["nvidia.com/gpu"]',
        }),
      ],
    });

    expect(result.data?.autoSelect).toBe(false);
    expect(result.data?.suggestion).toBeUndefined();
  });

  it('should not auto-select multiple candidates with a profile lacking accelerators', () => {
    const cpuOnlyProfile = mockHardwareProfile({
      identifiers: [
        {
          identifier: 'example.com/cpu',
          displayName: 'CPU',
          resourceType: IdentifierResourceType.CPU,
          defaultCount: 1,
          minCount: 1,
          maxCount: 4,
        },
      ],
    });
    const result = getInitialFieldData(
      undefined,
      {
        configs: [
          mockLLMInferenceServiceConfigK8sResource({
            name: 'amd',
            recommendedAccelerators: '["amd.com/gpu"]',
          }),
          mockLLMInferenceServiceConfigK8sResource({
            name: 'nvidia',
            recommendedAccelerators: '["nvidia.com/gpu"]',
          }),
        ],
      },
      { hardwareProfile: cpuOnlyProfile },
    );

    expect(result.data?.autoSelect).toBe(false);
    expect(result.data?.suggestion).toBeUndefined();
  });

  it('should auto-select the first compatible config when multiple configs match', () => {
    const first = mockLLMInferenceServiceConfigK8sResource({
      name: 'first',
      recommendedAccelerators: '["nvidia.com/gpu"]',
    });
    const second = mockLLMInferenceServiceConfigK8sResource({
      name: 'second',
      recommendedAccelerators: '["nvidia.com/gpu"]',
    });
    const gpuProfile = mockHardwareProfile({
      identifiers: [
        {
          identifier: 'nvidia.com/gpu',
          displayName: 'GPU',
          resourceType: IdentifierResourceType.ACCELERATOR,
          defaultCount: 1,
          minCount: 1,
          maxCount: 4,
        },
      ],
    });
    const result = getInitialFieldData(
      undefined,
      { configs: [first, second] },
      { hardwareProfile: gpuProfile },
    );

    expect(result.data?.autoSelect).toBe(true);
    expect(result.data?.suggestion?.name).toBe('first');
  });

  it('should skip incompatible configs before the single compatible config', () => {
    const compatibleConfig = mockLLMInferenceServiceConfigK8sResource({
      name: 'compatible',
      displayName: 'Compatible Config',
      recommendedAccelerators: '["nvidia.com/gpu"]',
    });
    const incompatibleConfig = mockLLMInferenceServiceConfigK8sResource({
      name: 'incompatible',
      displayName: 'Incompatible Config',
    });
    const gpuProfile = mockHardwareProfile({
      name: 'gpu-profile',
      identifiers: [
        {
          identifier: 'nvidia.com/gpu',
          displayName: 'GPU',
          resourceType: IdentifierResourceType.ACCELERATOR,
          defaultCount: 1,
          minCount: 1,
          maxCount: 4,
        },
      ],
    });
    const result = getInitialFieldData(
      undefined,
      { configs: [incompatibleConfig, compatibleConfig] },
      { hardwareProfile: gpuProfile },
    );

    expect(result.data?.autoSelect).toBe(true);
    expect(result.data?.suggestion?.name).toBe('compatible');
    expect(result.data?.selection?.name).toBe('compatible');
  });

  it.each([false, true])(
    'should match later accelerators and preserve config order (NVIDIA config present: %s)',
    (includeNvidia) => {
      const amd = mockLLMInferenceServiceConfigK8sResource({
        name: 'amd',
        recommendedAccelerators: '["amd.com/gpu"]',
      });
      const nvidia = mockLLMInferenceServiceConfigK8sResource({
        name: 'nvidia',
        recommendedAccelerators: '["nvidia.com/gpu"]',
      });
      const hardwareProfile = mockHardwareProfile({
        identifiers: ['nvidia.com/gpu', 'amd.com/gpu'].map((identifier) => ({
          identifier,
          displayName: identifier,
          resourceType: IdentifierResourceType.ACCELERATOR,
          defaultCount: 1,
          minCount: 1,
          maxCount: 4,
        })),
      });
      const result = getInitialFieldData(
        undefined,
        { configs: includeNvidia ? [amd, nvidia] : [amd] },
        { hardwareProfile },
      );
      expect(result.data?.autoSelect).toBe(true);
      expect(result.data?.selection?.name).toBe('amd');
    },
  );

  it('should not auto-select when there are no configs', () => {
    const result = getInitialFieldData(undefined, { configs: [] });

    expect(result.data?.autoSelect).toBe(false);
    expect(result.data?.suggestion).toBeUndefined();
  });
});
