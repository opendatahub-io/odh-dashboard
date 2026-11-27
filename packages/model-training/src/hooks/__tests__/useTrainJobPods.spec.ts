import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';
import { mockTrainJobK8sResource } from '../../__mocks__/mockTrainJobK8sResource';
import useTrainJobPods from '../useTrainJobPods';

jest.mock('@odh-dashboard/ui-core/hooks/useK8sWatchResourceList');

describe('useTrainJobPods', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should watch the selected job and group its pods', () => {
    const job = mockTrainJobK8sResource({ name: 'training-job' });
    const [initializer, worker1, worker2] = ['initializer-0', 'worker-0', 'worker-1'].map((role) =>
      mockPodK8sResource({ name: `${job.metadata.name}-${role}` }),
    );
    const pods = [initializer, worker1, worker2];
    jest.mocked(useK8sWatchResourceList).mockReturnValue([pods, true, undefined]);

    const { result } = testHook(useTrainJobPods)(job);

    expect(jest.mocked(useK8sWatchResourceList).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        isList: true,
        namespace: job.metadata.namespace,
        selector: {
          matchLabels: { 'jobset.sigs.k8s.io/jobset-name': job.metadata.name },
        },
      }),
    );
    expect(result.current).toEqual({
      pods,
      initializers: [initializer],
      training: [worker1, worker2],
      loaded: true,
      error: undefined,
    });
  });

  it('should disable the watch when no job is provided', () => {
    jest.mocked(useK8sWatchResourceList).mockReturnValue([[], false, undefined]);

    testHook(useTrainJobPods)(undefined);

    expect(jest.mocked(useK8sWatchResourceList).mock.calls[0][0]).toBeNull();
  });

  it.each([
    { state: 'loading', loaded: false, error: undefined },
    { state: 'loaded with no pods', loaded: true, error: undefined },
    { state: 'failed', loaded: false, error: new Error('Unable to watch pods') },
  ])('should return empty groups and watch state when $state', ({ loaded, error }) => {
    jest.mocked(useK8sWatchResourceList).mockReturnValue([[], loaded, error]);

    const { result } = testHook(useTrainJobPods)(mockTrainJobK8sResource());

    expect(result.current).toEqual({
      pods: [],
      initializers: [],
      training: [],
      loaded,
      error,
    });
  });

  it('should update groups when watched pods change or disappear', () => {
    const job = mockTrainJobK8sResource({ name: 'training-job' });
    const initializer = mockPodK8sResource({ name: `${job.metadata.name}-initializer-0` });
    const worker = mockPodK8sResource({ name: `${job.metadata.name}-worker-0` });
    jest.mocked(useK8sWatchResourceList).mockReturnValue([[initializer], true, undefined]);

    const { result, rerender } = testHook(useTrainJobPods)(job);
    expect(result.current.initializers).toEqual([initializer]);
    expect(result.current.training).toEqual([]);

    jest.mocked(useK8sWatchResourceList).mockReturnValue([[worker], true, undefined]);
    rerender(job);

    expect(result.current.pods).toEqual([worker]);
    expect(result.current.initializers).toEqual([]);
    expect(result.current.training).toEqual([worker]);

    jest.mocked(useK8sWatchResourceList).mockReturnValue([[], true, undefined]);
    rerender(job);

    expect(result.current.pods).toEqual([]);
    expect(result.current.initializers).toEqual([]);
    expect(result.current.training).toEqual([]);
  });

  it('should distinguish workers from initializers when the job name contains initializer', () => {
    const job = mockTrainJobK8sResource({ name: 'initializer-training-job' });
    const [worker, initializer] = ['worker', 'initializer'].map((role) =>
      mockPodK8sResource({
        name: `${job.metadata.name}-${role}-0`,
        namespace: job.metadata.namespace,
        labels: { 'jobset.sigs.k8s.io/jobset-name': job.metadata.name },
      }),
    );
    jest.mocked(useK8sWatchResourceList).mockReturnValue([[worker, initializer], true, undefined]);

    const { result } = testHook(useTrainJobPods)(job);

    expect(result.current.training).toEqual([worker]);
    expect(result.current.initializers).toEqual([initializer]);
  });
});
