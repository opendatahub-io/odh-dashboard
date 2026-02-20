import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockWorkloadK8sResource } from '#~/__mocks__/mockWorkloadK8sResource';
import { WorkloadStatusType } from '#~/concepts/distributedWorkloads/utils';
import {
  useKueueConfiguration,
  KueueFilteringState,
} from '#~/concepts/hardwareProfiles/kueueUtils';
import { KueueWorkloadStatus } from '#~/concepts/kueue/types';
import { useKueueStatusForNotebooks } from '#~/pages/projects/notebook/useKueueStatusForNotebooks';
import type { NotebookState } from '#~/pages/projects/notebook/types';
import { useWatchWorkloads } from '#~/api/k8s/workloads';

const notebookName = 'nb1';
const notebookName2 = 'nb2';

jest.mock('#~/concepts/hardwareProfiles/kueueUtils', () => ({
  ...jest.requireActual('#~/concepts/hardwareProfiles/kueueUtils'),
  useKueueConfiguration: jest.fn(),
}));

jest.mock('#~/api/k8s/workloads', () => ({
  ...jest.requireActual('#~/api/k8s/workloads'),
  useWatchWorkloads: jest.fn(),
}));

const useKueueConfigurationMock = jest.mocked(useKueueConfiguration);
const useWatchWorkloadsMock = jest.mocked(useWatchWorkloads);

function notebookState(name: string): NotebookState {
  const notebook = mockNotebookK8sResource({ name });
  return {
    notebook,
    isStarting: false,
    isRunning: false,
    isStopping: false,
    isStopped: true,
    runningPodUid: '',
    refresh: jest.fn(),
  };
}

const mockKueueConfig = {
  isKueueDisabled: false,
  isKueueFeatureEnabled: true,
  isProjectKueueEnabled: true,
  kueueFilteringState: KueueFilteringState.ONLY_KUEUE_PROFILES,
};

describe('useKueueStatusForNotebooks', () => {
  const project = mockProjectK8sResource({ k8sName: 'test-project', enableKueue: true });
  const namespace = project.metadata.name;

  beforeEach(() => {
    useKueueConfigurationMock.mockReturnValue(mockKueueConfig);
    useWatchWorkloadsMock.mockReturnValue([[], true, undefined]);
  });

  it('calls useKueueConfiguration with project', () => {
    testHook(useKueueStatusForNotebooks)([notebookState(notebookName)], project);
    expect(useKueueConfigurationMock).toHaveBeenCalledWith(project);
  });

  it('calls useKueueConfiguration with undefined when project is undefined', () => {
    testHook(useKueueStatusForNotebooks)(undefined, undefined);
    expect(useKueueConfigurationMock).toHaveBeenCalledWith(undefined);
  });

  it('returns empty map and does not watch when project is undefined', () => {
    useKueueConfigurationMock.mockReturnValue({
      ...mockKueueConfig,
      isKueueFeatureEnabled: false,
      isProjectKueueEnabled: false,
    });
    const { result } = testHook(useKueueStatusForNotebooks)(
      [notebookState(notebookName)],
      undefined,
    );
    expect(useWatchWorkloadsMock).toHaveBeenCalledWith(undefined);
    expect(result.current.kueueStatusByNotebookName).toEqual({});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns empty map and does not watch when Kueue feature is disabled', () => {
    useKueueConfigurationMock.mockReturnValue({
      ...mockKueueConfig,
      isKueueFeatureEnabled: false,
      isProjectKueueEnabled: true,
    });
    const { result } = testHook(useKueueStatusForNotebooks)([notebookState(notebookName)], project);
    expect(useWatchWorkloadsMock).toHaveBeenCalledWith(undefined);
    expect(result.current.kueueStatusByNotebookName).toEqual({});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns empty map and does not watch when project Kueue is not enabled', () => {
    useKueueConfigurationMock.mockReturnValue({
      ...mockKueueConfig,
      isKueueFeatureEnabled: true,
      isProjectKueueEnabled: false,
    });
    const { result } = testHook(useKueueStatusForNotebooks)([notebookState(notebookName)], project);
    expect(useWatchWorkloadsMock).toHaveBeenCalledWith(undefined);
    expect(result.current.kueueStatusByNotebookName).toEqual({});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('calls useWatchWorkloads with namespace when Kueue is enabled', () => {
    testHook(useKueueStatusForNotebooks)([notebookState(notebookName)], project);
    expect(useWatchWorkloadsMock).toHaveBeenCalledWith(namespace);
  });

  it('returns isLoading true when Kueue enabled and watch not loaded', () => {
    useWatchWorkloadsMock.mockReturnValue([[], false, undefined]);
    const { result } = testHook(useKueueStatusForNotebooks)([notebookState(notebookName)], project);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('returns error message when watch returns error', () => {
    const watchError = new Error('Watch failed');
    useWatchWorkloadsMock.mockReturnValue([[], true, watchError]);
    const { result } = testHook(useKueueStatusForNotebooks)([notebookState(notebookName)], project);
    expect(result.current.error).toBe('Watch failed');
    expect(result.current.isLoading).toBe(false);
  });

  it('returns empty map when notebookStates is undefined', () => {
    const { result } = testHook(useKueueStatusForNotebooks)(undefined, project);
    expect(result.current.kueueStatusByNotebookName).toEqual({});
  });

  it('returns empty map when Kueue enabled and no workloads', () => {
    const states = [notebookState(notebookName), notebookState(notebookName2)];
    const { result } = testHook(useKueueStatusForNotebooks)(states, project);
    expect(result.current.kueueStatusByNotebookName).toEqual({ nb1: null, nb2: null });
  });

  it('returns Kueue status per notebook when workloads match by job-name label', () => {
    const wl = mockWorkloadK8sResource({
      k8sName: 'wl-1',
      namespace: 'test-project',
      ownerName: 'my-notebook',
      mockStatus: WorkloadStatusType.Failed,
    });
    if (wl.metadata) {
      wl.metadata.labels = { ...wl.metadata.labels, 'kueue.x-k8s.io/job-name': 'my-notebook' };
    }
    useWatchWorkloadsMock.mockReturnValue([[wl], true, undefined]);
    const states = [notebookState('my-notebook')];
    const { result } = testHook(useKueueStatusForNotebooks)(states, project);
    expect(result.current.kueueStatusByNotebookName['my-notebook']).toEqual(
      expect.objectContaining({ status: KueueWorkloadStatus.Failed }),
    );
  });

  it('returns null for notebook with no matching workload', () => {
    const wl = mockWorkloadK8sResource({
      k8sName: 'wl-other',
      namespace: 'test-project',
      ownerName: 'other-notebook',
      mockStatus: WorkloadStatusType.Running,
    });
    if (wl.metadata) {
      wl.metadata.labels = { ...wl.metadata.labels, 'kueue.x-k8s.io/job-name': 'other-notebook' };
    }
    useWatchWorkloadsMock.mockReturnValue([[wl], true, undefined]);
    const states = [notebookState('my-notebook'), notebookState('other-notebook')];
    const { result } = testHook(useKueueStatusForNotebooks)(states, project);
    expect(result.current.kueueStatusByNotebookName['my-notebook']).toBeNull();
    expect(result.current.kueueStatusByNotebookName['other-notebook']).toEqual(
      expect.objectContaining({ status: KueueWorkloadStatus.Running }),
    );
  });

  it('returns Queued status when workload is Pending', () => {
    const wl = mockWorkloadK8sResource({
      k8sName: 'wl-pending',
      namespace: 'test-project',
      ownerName: 'nb-queued',
      mockStatus: WorkloadStatusType.Pending,
    });
    if (wl.metadata) {
      wl.metadata.labels = { ...wl.metadata.labels, 'kueue.x-k8s.io/job-name': 'nb-queued' };
    }
    useWatchWorkloadsMock.mockReturnValue([[wl], true, undefined]);
    const { result } = testHook(useKueueStatusForNotebooks)([notebookState('nb-queued')], project);
    expect(result.current.kueueStatusByNotebookName['nb-queued']).toEqual(
      expect.objectContaining({ status: KueueWorkloadStatus.Queued }),
    );
  });
});
