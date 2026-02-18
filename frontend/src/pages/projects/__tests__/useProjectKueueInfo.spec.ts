import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockLocalQueueK8sResource } from '#~/__mocks__/mockLocalQueueK8sResource';
import useProjectKueueInfo from '#~/pages/projects/useProjectKueueInfo';
import {
  useKueueConfiguration,
  KueueFilteringState,
} from '#~/concepts/hardwareProfiles/kueueUtils';
import useLocalQueues from '#~/concepts/distributedWorkloads/useLocalQueues';

jest.mock('#~/concepts/hardwareProfiles/kueueUtils', () => ({
  ...jest.requireActual('#~/concepts/hardwareProfiles/kueueUtils'),
  useKueueConfiguration: jest.fn(),
}));

jest.mock('#~/concepts/distributedWorkloads/useLocalQueues', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const useKueueConfigurationMock = jest.mocked(useKueueConfiguration);
const useLocalQueuesMock = jest.mocked(useLocalQueues);

const mockKueueConfig = {
  isKueueDisabled: false,
  isKueueFeatureEnabled: true,
  isProjectKueueEnabled: true,
  kueueFilteringState: KueueFilteringState.ONLY_KUEUE_PROFILES,
};

const mockLocalQueues = [
  mockLocalQueueK8sResource({ name: 'test-queue', namespace: 'test-project' }),
];

describe('useProjectKueueInfo', () => {
  beforeEach(() => {
    useKueueConfigurationMock.mockReturnValue(mockKueueConfig);
    useLocalQueuesMock.mockReturnValue([mockLocalQueues, true, undefined, jest.fn()]);
  });

  it('should call useKueueConfiguration with undefined when project is null', () => {
    testHook(useProjectKueueInfo)(null, 'test-project');
    expect(useKueueConfigurationMock).toHaveBeenCalledWith(undefined);
  });

  it('should call useKueueConfiguration with project when project is provided', () => {
    const project = mockProjectK8sResource({ k8sName: 'my-project', enableKueue: true });
    testHook(useProjectKueueInfo)(project, 'my-project');
    expect(useKueueConfigurationMock).toHaveBeenCalledWith(project);
  });

  it('should call useLocalQueues with namespace when Kueue feature and project Kueue are enabled', () => {
    useKueueConfigurationMock.mockReturnValue({
      ...mockKueueConfig,
      isKueueFeatureEnabled: true,
      isProjectKueueEnabled: true,
    });
    const renderResult = testHook(useProjectKueueInfo)(
      mockProjectK8sResource({ enableKueue: true }),
      'test-project',
    );
    expect(useLocalQueuesMock).toHaveBeenCalledWith('test-project');
    expect(renderResult.result.current.kueueConfig).toEqual(
      expect.objectContaining({
        isKueueFeatureEnabled: true,
        isProjectKueueEnabled: true,
      }),
    );
    expect(renderResult.result.current.localQueues).toEqual({
      data: mockLocalQueues,
      loaded: true,
      error: undefined,
      refresh: expect.any(Function),
    });
  });

  it('should call useLocalQueues with undefined when Kueue feature is disabled', () => {
    useKueueConfigurationMock.mockReturnValue({
      ...mockKueueConfig,
      isKueueFeatureEnabled: false,
      isProjectKueueEnabled: true,
    });
    testHook(useProjectKueueInfo)(mockProjectK8sResource({ enableKueue: true }), 'test-project');
    expect(useLocalQueuesMock).toHaveBeenCalledWith(undefined);
  });

  it('should call useLocalQueues with undefined when project Kueue is not enabled', () => {
    useKueueConfigurationMock.mockReturnValue({
      ...mockKueueConfig,
      isKueueFeatureEnabled: true,
      isProjectKueueEnabled: false,
    });
    testHook(useProjectKueueInfo)(mockProjectK8sResource({ enableKueue: false }), 'test-project');
    expect(useLocalQueuesMock).toHaveBeenCalledWith(undefined);
  });

  it('should return localQueues with data, loaded, error, and refresh from useLocalQueues', () => {
    const refreshFn = jest.fn();
    useLocalQueuesMock.mockReturnValue([mockLocalQueues, true, undefined, refreshFn]);
    const renderResult = testHook(useProjectKueueInfo)(
      mockProjectK8sResource({ enableKueue: true }),
      'test-project',
    );
    expect(renderResult.result.current.localQueues).toEqual({
      data: mockLocalQueues,
      loaded: true,
      error: undefined,
      refresh: refreshFn,
    });
  });

  it('should return localQueues with error when useLocalQueues returns error', () => {
    const error = new Error('Failed to fetch');
    useLocalQueuesMock.mockReturnValue([[], false, error, jest.fn()]);
    const renderResult = testHook(useProjectKueueInfo)(
      mockProjectK8sResource({ enableKueue: true }),
      'test-project',
    );
    expect(renderResult.result.current.localQueues).toEqual({
      data: [],
      loaded: false,
      error,
      refresh: expect.any(Function),
    });
  });
});
