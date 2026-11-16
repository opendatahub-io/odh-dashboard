import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockPodK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockPodK8sResource';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';
import { mockTrainJobK8sResource } from '../../__mocks__/mockTrainJobK8sResource';
import useTrainJobPods from '../useTrainJobPods';

jest.mock('@odh-dashboard/ui-core/hooks/useK8sWatchResourceList');

describe('useTrainJobPods', () => {
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
