import { WorkloadKind } from '@odh-dashboard/k8s-core';
import { WorkloadModel, JobSetModel } from '@odh-dashboard/k8s-core/api/models';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';
import { mockTrainJobK8sResource } from '../../../../__mocks__/mockTrainJobK8sResource';
import { useWorkloadForTrainJob } from '../useWorkloadForTrainJob';

jest.mock('@odh-dashboard/ui-core/hooks/useK8sWatchResourceList', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const useK8sWatchMock = jest.mocked(useK8sWatchResourceList);

type MockWatchConfig = {
  workloads?: WorkloadKind[];
  workloadsLoaded?: boolean;
  jobSets?: { metadata: { name: string; uid: string } }[];
  jobSetsLoaded?: boolean;
};

const mockWatches = ({
  workloads = [],
  workloadsLoaded = true,
  jobSets = [],
  jobSetsLoaded = true,
}: MockWatchConfig): void => {
  useK8sWatchMock.mockImplementation(((_: unknown, model?: unknown) => {
    if (model === WorkloadModel) return [workloads, workloadsLoaded, undefined];
    if (model === JobSetModel) return [jobSets, jobSetsLoaded, undefined];
    throw new Error('unexpected watch model');
  }) as never);
};

const makeWorkload = ({
  name,
  ownerUid,
  labels = {},
  creationTimestamp = '2024-01-15T10:30:00Z',
}: {
  name: string;
  ownerUid?: string;
  labels?: Record<string, string>;
  creationTimestamp?: string;
}): WorkloadKind => ({
  apiVersion: 'kueue.x-k8s.io/v1beta2',
  kind: 'Workload',
  metadata: {
    name,
    namespace: 'test-ns',
    uid: `workload-uid-${name}`,
    creationTimestamp,
    labels,
    ...(ownerUid && {
      ownerReferences: [
        {
          apiVersion: 'jobset.x-k8s.io/v1alpha2',
          kind: 'JobSet',
          name: 'test-job',
          uid: ownerUid,
          blockOwnerDeletion: true,
          controller: true,
        },
      ],
    }),
  },
  spec: { active: true, podSets: [], queueName: 'default-queue' },
});

const mockJob = () =>
  mockTrainJobK8sResource({ name: 'test-job', namespace: 'test-ns', uid: 'trainjob-uid-1' });

const mockJobSet = (uid: string) => ({ metadata: { name: 'test-job', uid } });

describe('useWorkloadForTrainJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should match a workload whose JobSet ownerReference uid equals the current JobSet uid', () => {
    const workload = makeWorkload({ name: 'test-workload', ownerUid: 'jobset-new-uid' });
    mockWatches({ workloads: [workload], jobSets: [mockJobSet('jobset-new-uid')] });

    const renderResult = testHook(useWorkloadForTrainJob)(mockJob());

    expect(renderResult.result.current[0]).toHaveLength(1);
    expect(renderResult.result.current[0]).toContain(workload);
  });

  it('should reject a stale workload whose JobSet ownerReference uid does not match the current JobSet uid', () => {
    // Workload belongs to a JobSet that was deleted and recreated with the same name.
    const staleWorkload = makeWorkload({ name: 'stale-workload', ownerUid: 'jobset-old-uid' });
    mockWatches({ workloads: [staleWorkload], jobSets: [mockJobSet('jobset-new-uid')] });

    const renderResult = testHook(useWorkloadForTrainJob)(mockJob());

    expect(renderResult.result.current[0]).toHaveLength(0);
  });

  it('should not filter by uid when the JobSet watch has not loaded yet', () => {
    const workload = makeWorkload({ name: 'test-workload', ownerUid: 'jobset-old-uid' });
    mockWatches({
      workloads: [workload],
      jobSets: [mockJobSet('jobset-new-uid')],
      jobSetsLoaded: false,
    });

    const renderResult = testHook(useWorkloadForTrainJob)(mockJob());

    expect(renderResult.result.current[0]).toHaveLength(1);
  });

  it('should still match by TrainJob uid label and sort newest first', () => {
    const older = makeWorkload({
      name: 'older-workload',
      labels: { 'kueue.x-k8s.io/job-uid': 'trainjob-uid-1' },
      creationTimestamp: '2024-01-15T10:00:00Z',
    });
    const newer = makeWorkload({
      name: 'newer-workload',
      labels: { 'kueue.x-k8s.io/job-uid': 'trainjob-uid-1' },
      creationTimestamp: '2024-01-15T11:00:00Z',
    });
    mockWatches({ workloads: [older, newer], jobSets: [mockJobSet('jobset-new-uid')] });

    const renderResult = testHook(useWorkloadForTrainJob)(mockJob());

    expect(renderResult.result.current[0]).toHaveLength(2);
    expect(renderResult.result.current[0].map((w) => w.metadata?.name)).toEqual([
      'newer-workload',
      'older-workload',
    ]);
  });
});
