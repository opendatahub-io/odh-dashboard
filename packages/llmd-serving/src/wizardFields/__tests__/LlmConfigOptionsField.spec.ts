import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import * as projectSelectors from '@odh-dashboard/internal/redux/selectors/project';
import * as llmConfigsApi from '../../api/LLMInferenceServiceConfigs';
import { useLLMConfigOptions } from '../LlmConfigOptionsField';

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
