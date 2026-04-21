import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import * as clusterSettingsModule from '@odh-dashboard/model-serving/concepts/useModelServingClusterSettings';
import * as projectSelectors from '@odh-dashboard/internal/redux/selectors/project';
import * as llmConfigsApi from '../../api/LLMInferenceServiceConfigs';
import { useLLMConfigOptions } from '../LlmConfigOptionsField';

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
