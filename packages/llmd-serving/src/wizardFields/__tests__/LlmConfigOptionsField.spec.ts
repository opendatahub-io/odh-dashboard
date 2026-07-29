import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { mockHardwareProfile } from '@odh-dashboard/internal/__mocks__/mockHardwareProfile';
import { IdentifierResourceType } from '@odh-dashboard/k8s-core';
import * as projectSelectors from '@odh-dashboard/internal/redux/selectors/project';
import * as llmConfigsApi from '../../api/LLMInferenceServiceConfigs';
import { useLLMConfigOptions, LLMConfigOptionsFieldNoTemplates } from '../LlmConfigOptionsField';

jest.mock('@odh-dashboard/internal/redux/selectors/project');
jest.mock('../../api/LLMInferenceServiceConfigs');

const mockUseDashboardNamespace = jest.mocked(projectSelectors.useDashboardNamespace);
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

describe('getInitialFieldData', () => {
  const { getInitialFieldData } = LLMConfigOptionsFieldNoTemplates.reducerFunctions;

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

  it('should auto-select with suggestion when there is only one config', () => {
    const config = mockLLMInferenceServiceConfigK8sResource({
      name: 'only-config',
      displayName: 'Only Config',
    });
    const result = getInitialFieldData(undefined, { configs: [config] });

    expect(result.data?.autoSelect).toBe(true);
    expect(result.data?.suggestion).toBeDefined();
    expect(result.data?.suggestion?.name).toBe('only-config');
    expect(result.data?.selection?.name).toBe('only-config');
  });

  it('should auto-select the single hardware-compatible config among multiple', () => {
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
      { configs: [compatibleConfig, incompatibleConfig] },
      { hardwareProfile: gpuProfile },
    );

    expect(result.data?.autoSelect).toBe(true);
    expect(result.data?.suggestion?.name).toBe('compatible');
    expect(result.data?.selection?.name).toBe('compatible');
  });

  it('should not auto-select when multiple configs match hardware profile', () => {
    const config1 = mockLLMInferenceServiceConfigK8sResource({
      name: 'config-1',
      displayName: 'Config 1',
      recommendedAccelerators: '["nvidia.com/gpu"]',
    });
    const config2 = mockLLMInferenceServiceConfigK8sResource({
      name: 'config-2',
      displayName: 'Config 2',
      recommendedAccelerators: '["nvidia.com/gpu"]',
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
      { configs: [config1, config2] },
      { hardwareProfile: gpuProfile },
    );

    expect(result.data?.autoSelect).toBe(false);
    expect(result.data?.suggestion).toBeUndefined();
  });

  it('should not auto-select when there are no configs', () => {
    const result = getInitialFieldData(undefined, { configs: [] });

    expect(result.data?.autoSelect).toBe(false);
    expect(result.data?.suggestion).toBeUndefined();
  });
});
