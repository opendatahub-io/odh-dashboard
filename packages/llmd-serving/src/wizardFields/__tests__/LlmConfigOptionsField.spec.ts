import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { mockHardwareProfile } from '@odh-dashboard/internal/__mocks__/mockHardwareProfile';
import { IdentifierResourceType } from '@odh-dashboard/internal/types';
import * as clusterSettingsModule from '@odh-dashboard/model-serving/concepts/useModelServingClusterSettings';
import * as projectSelectors from '@odh-dashboard/internal/redux/selectors/project';
import * as llmConfigsApi from '../../api/LLMInferenceServiceConfigs';
import { LLMD_OPTION } from '../../deployments/server';
import { useLLMConfigOptions, LLMConfigOptionsFieldWizardField } from '../LlmConfigOptionsField';

jest.mock('@odh-dashboard/model-serving/concepts/useModelServingClusterSettings');
jest.mock('@odh-dashboard/internal/redux/selectors/project');
jest.mock('../../api/LLMInferenceServiceConfigs');

const mockUseModelServingClusterSettings = jest.mocked(
  clusterSettingsModule.useModelServingClusterSettings,
);
const mockUseDashboardNamespace = jest.mocked(projectSelectors.useDashboardNamespace);
const mockUseFetchLLMInferenceServiceConfigs = jest.mocked(
  llmConfigsApi.useFetchLLMInferenceServiceConfigs,
);

describe('useLLMConfigOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseModelServingClusterSettings.mockReturnValue({
      data: { isLLMdDefault: false },
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
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

  it('should reflect isLlmdSuggested from cluster settings', () => {
    mockUseModelServingClusterSettings.mockReturnValue({
      data: { isLLMdDefault: true },
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useLLMConfigOptions)();

    expect(renderResult.result.current.data.isLlmdSuggested).toBe(true);
  });

  it('should report loaded as false when cluster settings are not loaded', () => {
    mockUseModelServingClusterSettings.mockReturnValue({
      data: undefined,
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useLLMConfigOptions)();

    expect(renderResult.result.current.loaded).toBe(false);
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

  it('should propagate load errors from cluster settings', () => {
    const settingsError = new Error('Failed to fetch cluster settings');
    mockUseModelServingClusterSettings.mockReturnValue({
      data: undefined,
      loaded: false,
      error: settingsError,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useLLMConfigOptions)();

    expect(renderResult.result.current.loadError).toBe(settingsError);
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
    // Remove the disabled annotation explicitly — the mock doesn't add it by default
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
  const { getInitialFieldData } = LLMConfigOptionsFieldWizardField.reducerFunctions;

  const amdConfig = mockLLMInferenceServiceConfigK8sResource({
    name: 'llm-template-amd-rocm',
    displayName: 'AMD ROCm Config',
    recommendedAccelerators: '["amd.com/gpu"]',
  });

  const nvidiaConfig = mockLLMInferenceServiceConfigK8sResource({
    name: 'llm-template-nvidia-cuda',
    displayName: 'NVIDIA CUDA Config',
    recommendedAccelerators: '["nvidia.com/gpu"]',
  });

  const amdHardwareProfile = mockHardwareProfile({
    name: 'mi300x',
    displayName: 'AMD MI300X',
    identifiers: [
      {
        displayName: 'AMD GPU',
        identifier: 'amd.com/gpu',
        minCount: '1',
        maxCount: '8',
        defaultCount: '1',
        resourceType: IdentifierResourceType.ACCELERATOR,
      },
    ],
  });

  const nvidiaHardwareProfile = mockHardwareProfile({
    name: 'a100',
    displayName: 'NVIDIA A100',
    identifiers: [
      {
        displayName: 'NVIDIA GPU',
        identifier: 'nvidia.com/gpu',
        minCount: '1',
        maxCount: '8',
        defaultCount: '1',
        resourceType: IdentifierResourceType.ACCELERATOR,
      },
    ],
  });

  it('should return existing field data when present', () => {
    const existingData = { data: { selection: LLMD_OPTION } };
    const result = getInitialFieldData(existingData);
    expect(result).toBe(existingData);
  });

  it('should select LLMD_OPTION when isLlmdSuggested and no hardware profile', () => {
    const result = getInitialFieldData(undefined, {
      configs: [amdConfig, nvidiaConfig],
      isLlmdSuggested: true,
    });
    expect(result.data?.selection).toBe(LLMD_OPTION);
    expect(result.data?.autoSelect).toBe(true);
  });

  it('should select AMD config when isLlmdSuggested with AMD hardware profile', () => {
    const result = getInitialFieldData(
      undefined,
      { configs: [amdConfig, nvidiaConfig], isLlmdSuggested: true },
      { hardwareProfile: amdHardwareProfile },
    );
    expect(result.data?.selection?.name).toBe('llm-template-amd-rocm');
    expect(result.data?.autoSelect).toBe(true);
    expect(result.data?.suggestion?.name).toBe('llm-template-amd-rocm');
  });

  it('should select NVIDIA config when isLlmdSuggested with NVIDIA hardware profile', () => {
    const result = getInitialFieldData(
      undefined,
      { configs: [amdConfig, nvidiaConfig], isLlmdSuggested: true },
      { hardwareProfile: nvidiaHardwareProfile },
    );
    expect(result.data?.selection?.name).toBe('llm-template-nvidia-cuda');
    expect(result.data?.autoSelect).toBe(true);
  });

  it('should select hardware-compatible config even without isLlmdSuggested', () => {
    const result = getInitialFieldData(
      undefined,
      { configs: [amdConfig, nvidiaConfig], isLlmdSuggested: false },
      { hardwareProfile: amdHardwareProfile },
    );
    expect(result.data?.selection?.name).toBe('llm-template-amd-rocm');
    expect(result.data?.autoSelect).toBe(true);
  });

  it('should select LLMD_OPTION when isLlmdSuggested with hardware profile that has no matching config', () => {
    const noGpuProfile = mockHardwareProfile({
      name: 'cpu-only',
      displayName: 'CPU Only',
      identifiers: [
        {
          displayName: 'CPU',
          identifier: 'cpu',
          minCount: '1',
          maxCount: '4',
          defaultCount: '2',
          resourceType: IdentifierResourceType.CPU,
        },
      ],
    });
    const result = getInitialFieldData(
      undefined,
      { configs: [amdConfig, nvidiaConfig], isLlmdSuggested: true },
      { hardwareProfile: noGpuProfile },
    );
    expect(result.data?.selection).toBe(LLMD_OPTION);
    expect(result.data?.autoSelect).toBe(true);
  });

  it('should not auto-select when multiple configs match hardware profile', () => {
    const amdConfig2 = mockLLMInferenceServiceConfigK8sResource({
      name: 'llm-template-amd-rocm-v2',
      displayName: 'AMD ROCm Config v2',
      recommendedAccelerators: '["amd.com/gpu"]',
    });
    const result = getInitialFieldData(
      undefined,
      { configs: [amdConfig, amdConfig2, nvidiaConfig], isLlmdSuggested: false },
      { hardwareProfile: amdHardwareProfile },
    );
    expect(result.data?.autoSelect).toBe(false);
  });

  it('should not auto-select LLMD when isLlmdSuggested with multiple hardware matches', () => {
    const amdConfig2 = mockLLMInferenceServiceConfigK8sResource({
      name: 'llm-template-amd-rocm-v2',
      displayName: 'AMD ROCm Config v2',
      recommendedAccelerators: '["amd.com/gpu"]',
    });
    const result = getInitialFieldData(
      undefined,
      { configs: [amdConfig, amdConfig2, nvidiaConfig], isLlmdSuggested: true },
      { hardwareProfile: amdHardwareProfile },
    );
    expect(result.data?.autoSelect).toBe(false);
  });

  it('should select the only option when there is just one', () => {
    const result = getInitialFieldData(undefined, {
      configs: [],
      isLlmdSuggested: false,
    });
    expect(result.data?.selection).toBe(LLMD_OPTION);
  });
});
