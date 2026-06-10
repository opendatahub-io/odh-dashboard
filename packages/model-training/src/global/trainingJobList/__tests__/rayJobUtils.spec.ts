import { WorkloadCondition, WorkloadKind } from '@odh-dashboard/internal/k8sTypes';
import { mockRayJobK8sResource } from '../../../__mocks__/mockRayJobK8sResource';
import { mockTrainJobK8sResource } from '../../../__mocks__/mockTrainJobK8sResource';
import {
  TrainingJobState,
  RayJobState,
  RayJobDeploymentStatus,
  RayJobStatusValue,
} from '../../../types';
import { getWorkloadForJob } from '../../../api';
import {
  getRayJobStatus,
  getRayJobStatusSync,
  getRayJobNodeCount,
  getUnifiedJobNodeCount,
  getUnifiedJobStatusSync,
  getRayJobStatusAlert,
  WorkloadConditionType,
  ConditionStatus,
} from '../utils';
import { KUEUE_QUEUE_LABEL } from '../../../const';

const TEST_TIMESTAMP = '2024-01-01T00:00:00Z';

const makeWorkloadCondition = (overrides: Partial<WorkloadCondition>): WorkloadCondition => ({
  type: WorkloadConditionType.Finished,
  status: ConditionStatus.True,
  reason: '',
  message: '',
  lastTransitionTime: TEST_TIMESTAMP,
  ...overrides,
});

jest.mock('../../../api', () => ({
  getWorkloadForJob: jest.fn(),
}));

const mockGetWorkloadForJob = jest.mocked(getWorkloadForJob);

const makeWorkload = (
  conditions: NonNullable<WorkloadKind['status']>['conditions'] = [],
  active = true,
): WorkloadKind =>
  ({
    apiVersion: 'kueue.x-k8s.io/v1beta2',
    kind: 'Workload',
    metadata: { name: 'test-workload', namespace: 'test-ns' },
    spec: { active, podSets: [], priority: 0, queueName: 'default' },
    status: { conditions },
  } as WorkloadKind);

describe('getRayJobStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const kueueJob = (overrides = {}) =>
    mockRayJobK8sResource({
      additionalLabels: { [KUEUE_QUEUE_LABEL]: 'default-queue' },
      ...overrides,
    });

  // ──────────────────────────────────────────────────────────────────
  // P1: DELETING
  // ──────────────────────────────────────────────────────────────────
  it('P1 — should return DELETING when deletionTimestamp is set', async () => {
    const job = mockRayJobK8sResource({ isDeleting: true });
    expect((await getRayJobStatus(job)).status).toBe(RayJobState.DELETING);
    expect(mockGetWorkloadForJob).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────
  // P2: SUCCEEDED (CR — no workload fetch)
  // ──────────────────────────────────────────────────────────────────
  it('P2 — SUCCEEDED when jobStatus SUCCEEDED + jobDeploymentStatus Complete', async () => {
    const job = mockRayJobK8sResource({
      jobStatus: RayJobStatusValue.SUCCEEDED,
      jobDeploymentStatus: RayJobDeploymentStatus.COMPLETE,
    });
    expect((await getRayJobStatus(job)).status).toBe(RayJobState.SUCCEEDED);
    expect(mockGetWorkloadForJob).not.toHaveBeenCalled();
  });

  it('P2 — SUCCEEDED when jobStatus STOPPED + jobDeploymentStatus Complete', async () => {
    const job = mockRayJobK8sResource({ jobDeploymentStatus: RayJobDeploymentStatus.COMPLETE });
    if (job.status) job.status.jobStatus = 'STOPPED';
    expect((await getRayJobStatus(job)).status).toBe(RayJobState.SUCCEEDED);
  });

  // ──────────────────────────────────────────────────────────────────
  // P4: FAILED (non-Kueue: early exit; Kueue: checked after P3 Inadmissible)
  // ──────────────────────────────────────────────────────────────────
  it('P4 — FAILED when jobStatus FAILED', async () => {
    const job = mockRayJobK8sResource({ jobStatus: RayJobStatusValue.FAILED });
    expect((await getRayJobStatus(job)).status).toBe(RayJobState.FAILED);
    expect(mockGetWorkloadForJob).not.toHaveBeenCalled();
  });

  it('P4 — FAILED when jobDeploymentStatus ValidationFailed', async () => {
    const job = mockRayJobK8sResource({
      jobDeploymentStatus: RayJobDeploymentStatus.VALIDATION_FAILED,
    });
    expect((await getRayJobStatus(job)).status).toBe(RayJobState.FAILED);
  });

  // ──────────────────────────────────────────────────────────────────
  // NON-KUEUE JOBS (no queue label → delegates to sync logic)
  // ──────────────────────────────────────────────────────────────────
  it('non-Kueue — RUNNING via sync fallback', async () => {
    const job = mockRayJobK8sResource({
      jobStatus: RayJobStatusValue.RUNNING,
      jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
    });
    expect((await getRayJobStatus(job)).status).toBe(RayJobState.RUNNING);
    expect(mockGetWorkloadForJob).not.toHaveBeenCalled();
  });

  it('non-Kueue — PAUSED when Suspended via sync fallback', async () => {
    const job = mockRayJobK8sResource({ jobDeploymentStatus: RayJobDeploymentStatus.SUSPENDED });
    expect((await getRayJobStatus(job)).status).toBe(RayJobState.PAUSED);
  });

  // ──────────────────────────────────────────────────────────────────
  // KUEUE + WORKLOAD PRESENT
  // ──────────────────────────────────────────────────────────────────
  it('Kueue — P3 INADMISSIBLE when QuotaReserved=False + reason=Inadmissible', async () => {
    mockGetWorkloadForJob.mockResolvedValue(
      makeWorkload([
        {
          type: 'QuotaReserved',
          status: 'False',
          reason: 'Inadmissible',
          message: '',
          lastTransitionTime: '',
        },
      ]),
    );
    expect((await getRayJobStatus(kueueJob())).status).toBe(RayJobState.INADMISSIBLE);
  });

  it('Kueue — P3 INADMISSIBLE wins over CR ValidationFailed (priority fix)', async () => {
    mockGetWorkloadForJob.mockResolvedValue(
      makeWorkload([
        {
          type: 'QuotaReserved',
          status: 'False',
          reason: 'Inadmissible',
          message: 'No matching flavor',
          lastTransitionTime: '',
        },
      ]),
    );
    const job = kueueJob({ jobDeploymentStatus: RayJobDeploymentStatus.VALIDATION_FAILED });
    expect((await getRayJobStatus(job)).status).toBe(RayJobState.INADMISSIBLE);
  });

  it('Kueue — P5 FAILED via workload Finished condition with error message', async () => {
    mockGetWorkloadForJob.mockResolvedValue(
      makeWorkload([
        {
          type: 'Finished',
          status: 'True',
          reason: 'Failed',
          message: 'job failed due to error',
          lastTransitionTime: '',
        },
      ]),
    );
    expect((await getRayJobStatus(kueueJob())).status).toBe(RayJobState.FAILED);
  });

  it('Kueue — P6 SUCCEEDED via workload Finished condition with success message', async () => {
    mockGetWorkloadForJob.mockResolvedValue(
      makeWorkload([
        {
          type: 'Finished',
          status: 'True',
          reason: 'Succeeded',
          message: 'job succeeded',
          lastTransitionTime: '',
        },
      ]),
    );
    expect((await getRayJobStatus(kueueJob())).status).toBe(RayJobState.SUCCEEDED);
  });

  it('Kueue — P7 PAUSED when workload.spec.active=false', async () => {
    mockGetWorkloadForJob.mockResolvedValue(makeWorkload([], false));
    expect((await getRayJobStatus(kueueJob())).status).toBe(RayJobState.PAUSED);
  });

  it('Kueue — P7 PAUSED when jobDeploymentStatus Suspended', async () => {
    mockGetWorkloadForJob.mockResolvedValue(makeWorkload());
    expect(
      (await getRayJobStatus(kueueJob({ jobDeploymentStatus: RayJobDeploymentStatus.SUSPENDED })))
        .status,
    ).toBe(RayJobState.PAUSED);
  });

  it('Kueue — P8 PREEMPTED when workload Evicted condition', async () => {
    mockGetWorkloadForJob.mockResolvedValue(
      makeWorkload([
        {
          type: 'Evicted',
          status: 'True',
          reason: 'Preempted',
          message: '',
          lastTransitionTime: '',
        },
      ]),
    );
    expect((await getRayJobStatus(kueueJob())).status).toBe(RayJobState.PREEMPTED);
  });

  it('Kueue — P9 RUNNING when workload PodsReady=True', async () => {
    mockGetWorkloadForJob.mockResolvedValue(
      makeWorkload([
        { type: 'PodsReady', status: 'True', reason: '', message: '', lastTransitionTime: '' },
      ]),
    );
    expect((await getRayJobStatus(kueueJob())).status).toBe(RayJobState.RUNNING);
  });

  it('Kueue — P9 RUNNING when jobStatus RUNNING (no PodsReady)', async () => {
    mockGetWorkloadForJob.mockResolvedValue(makeWorkload());
    expect(
      (
        await getRayJobStatus(
          kueueJob({
            jobStatus: RayJobStatusValue.RUNNING,
            jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
          }),
        )
      ).status,
    ).toBe(RayJobState.RUNNING);
  });

  it('Kueue — P10 PENDING when QuotaReserved=True', async () => {
    mockGetWorkloadForJob.mockResolvedValue(
      makeWorkload([
        {
          type: 'QuotaReserved',
          status: 'True',
          reason: 'QuotaReserved',
          message: '',
          lastTransitionTime: '',
        },
      ]),
    );
    expect(
      (await getRayJobStatus(kueueJob({ jobDeploymentStatus: RayJobDeploymentStatus.WAITING })))
        .status,
    ).toBe(RayJobState.PENDING);
  });

  it('Kueue — P10 PENDING when jobDeploymentStatus Initializing (no workload conditions)', async () => {
    mockGetWorkloadForJob.mockResolvedValue(makeWorkload());
    expect(
      (
        await getRayJobStatus(
          kueueJob({ jobDeploymentStatus: RayJobDeploymentStatus.INITIALIZING }),
        )
      ).status,
    ).toBe(RayJobState.PENDING);
  });

  it('Kueue — P11 QUEUED when no matching conditions', async () => {
    mockGetWorkloadForJob.mockResolvedValue(makeWorkload());
    expect(
      (await getRayJobStatus(kueueJob({ jobDeploymentStatus: RayJobDeploymentStatus.WAITING })))
        .status,
    ).toBe(RayJobState.QUEUED);
  });

  // ──────────────────────────────────────────────────────────────────
  // KUEUE — no workload created yet
  // ──────────────────────────────────────────────────────────────────
  it('Kueue, no workload — FAILED when jobStatus FAILED', async () => {
    mockGetWorkloadForJob.mockResolvedValue(null);
    expect((await getRayJobStatus(kueueJob({ jobStatus: RayJobStatusValue.FAILED }))).status).toBe(
      RayJobState.FAILED,
    );
  });

  it('Kueue, no workload — FAILED when jobDeploymentStatus Failed', async () => {
    mockGetWorkloadForJob.mockResolvedValue(null);
    expect(
      (await getRayJobStatus(kueueJob({ jobDeploymentStatus: RayJobDeploymentStatus.FAILED })))
        .status,
    ).toBe(RayJobState.FAILED);
  });

  it('Kueue, no workload — FAILED when jobDeploymentStatus ValidationFailed', async () => {
    mockGetWorkloadForJob.mockResolvedValue(null);
    expect(
      (
        await getRayJobStatus(
          kueueJob({ jobDeploymentStatus: RayJobDeploymentStatus.VALIDATION_FAILED }),
        )
      ).status,
    ).toBe(RayJobState.FAILED);
  });

  it('Kueue, no workload — PAUSED when spec.suspend=true', async () => {
    mockGetWorkloadForJob.mockResolvedValue(null);
    expect((await getRayJobStatus(kueueJob({ suspend: true }))).status).toBe(RayJobState.PAUSED);
  });

  it('Kueue, no workload — RUNNING via CR fields', async () => {
    mockGetWorkloadForJob.mockResolvedValue(null);
    expect(
      (
        await getRayJobStatus(
          kueueJob({
            jobStatus: RayJobStatusValue.RUNNING,
            jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
          }),
        )
      ).status,
    ).toBe(RayJobState.RUNNING);
  });

  it('Kueue, no workload — QUEUED as fallback', async () => {
    mockGetWorkloadForJob.mockResolvedValue(null);
    const job = kueueJob({});
    if (job.status) {
      job.status.jobStatus = undefined;
      job.status.jobDeploymentStatus = undefined;
    }
    expect((await getRayJobStatus(job)).status).toBe(RayJobState.QUEUED);
  });

  // ──────────────────────────────────────────────────────────────────
  // Error handling
  // ──────────────────────────────────────────────────────────────────
  it('should fall back to sync status on API error', async () => {
    mockGetWorkloadForJob.mockRejectedValue(new Error('API failure'));
    const job = kueueJob({
      jobStatus: RayJobStatusValue.RUNNING,
      jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
    });
    const result = await getRayJobStatus(job);
    expect(result.status).toBe(RayJobState.RUNNING);
    expect(result.error).toBeDefined();
  });
});

describe('getRayJobStatusSync', () => {
  it('should return DELETING when deletionTimestamp is set', () => {
    const job = mockRayJobK8sResource({ isDeleting: true });
    expect(getRayJobStatusSync(job)).toBe(RayJobState.DELETING);
  });

  it('should return SUCCEEDED when Complete + SUCCEEDED', () => {
    const job = mockRayJobK8sResource({
      jobDeploymentStatus: RayJobDeploymentStatus.COMPLETE,
      jobStatus: RayJobStatusValue.SUCCEEDED,
    });
    expect(getRayJobStatusSync(job)).toBe(RayJobState.SUCCEEDED);
  });

  it('should return FAILED when deployment status is Failed', () => {
    const job = mockRayJobK8sResource({
      jobDeploymentStatus: RayJobDeploymentStatus.FAILED,
      jobStatus: RayJobStatusValue.FAILED,
    });
    expect(getRayJobStatusSync(job)).toBe(RayJobState.FAILED);
  });

  it('should return PAUSED when Suspended', () => {
    const job = mockRayJobK8sResource({
      jobDeploymentStatus: RayJobDeploymentStatus.SUSPENDED,
    });
    expect(getRayJobStatusSync(job)).toBe(RayJobState.PAUSED);
  });

  it('should return RUNNING when job status is RUNNING', () => {
    const job = mockRayJobK8sResource({
      jobStatus: RayJobStatusValue.RUNNING,
      jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
    });
    expect(getRayJobStatusSync(job)).toBe(RayJobState.RUNNING);
  });

  it('should return PENDING when Initializing', () => {
    const job = mockRayJobK8sResource({
      jobDeploymentStatus: RayJobDeploymentStatus.INITIALIZING,
      jobStatus: undefined,
    });
    expect(getRayJobStatusSync(job)).toBe(RayJobState.PENDING);
  });

  it('should return QUEUED when Waiting', () => {
    const job = mockRayJobK8sResource({
      jobDeploymentStatus: RayJobDeploymentStatus.WAITING,
      jobStatus: undefined,
    });
    expect(getRayJobStatusSync(job)).toBe(RayJobState.QUEUED);
  });
});

describe('getRayJobNodeCount', () => {
  it('should return 1 for a job with no worker groups (head only)', () => {
    const job = mockRayJobK8sResource({});
    job.spec.rayClusterSpec = { headGroupSpec: { template: {} } };
    expect(getRayJobNodeCount(job)).toBe(1);
  });

  it('should aggregate worker replicas across all groups plus head node', () => {
    const job = mockRayJobK8sResource({});
    job.spec.rayClusterSpec = {
      headGroupSpec: { template: {} },
      workerGroupSpecs: [
        { groupName: 'workers-1', replicas: 3, template: {} },
        { groupName: 'workers-2', replicas: 2, template: {} },
      ],
    };
    expect(getRayJobNodeCount(job)).toBe(6);
  });

  it('should treat undefined replicas as 0', () => {
    const job = mockRayJobK8sResource({});
    job.spec.rayClusterSpec = {
      headGroupSpec: { template: {} },
      workerGroupSpecs: [{ groupName: 'workers', replicas: undefined, template: {} }],
    };
    expect(getRayJobNodeCount(job)).toBe(1);
  });

  it('should return 0 when rayClusterSpec is missing and no cluster selector', () => {
    const job = mockRayJobK8sResource({});
    job.spec.rayClusterSpec = undefined;
    expect(getRayJobNodeCount(job)).toBe(0);
  });

  it('should resolve node count from rayClustersMap for workspace jobs', () => {
    const job = mockRayJobK8sResource({});
    job.spec.rayClusterSpec = undefined;
    job.spec.clusterSelector = { 'ray.io/cluster': 'my-cluster' };

    const rayClustersMap = new Map([
      [
        'my-cluster',
        {
          metadata: { name: 'my-cluster', namespace: 'ns' },
          spec: {
            headGroupSpec: { template: {} },
            workerGroupSpecs: [{ groupName: 'workers', replicas: 3, template: {} }],
          },
        } as never,
      ],
    ]);

    expect(getRayJobNodeCount(job, rayClustersMap)).toBe(4);
  });

  it('should return 0 for workspace job when cluster is not in map', () => {
    const job = mockRayJobK8sResource({});
    job.spec.rayClusterSpec = undefined;
    job.spec.clusterSelector = { 'ray.io/cluster': 'missing-cluster' };

    const rayClustersMap = new Map();
    expect(getRayJobNodeCount(job, rayClustersMap)).toBe(0);
  });
});

describe('getUnifiedJobNodeCount', () => {
  it('should return TrainJob numNodes for TrainJobs', () => {
    const job = mockTrainJobK8sResource({ numNodes: 4 });
    expect(getUnifiedJobNodeCount(job)).toBe(4);
  });

  it('should return aggregated node count for RayJobs', () => {
    const job = mockRayJobK8sResource({});
    job.spec.rayClusterSpec = {
      headGroupSpec: { template: {} },
      workerGroupSpecs: [{ groupName: 'workers', replicas: 3, template: {} }],
    };
    expect(getUnifiedJobNodeCount(job)).toBe(4);
  });
});

describe('getUnifiedJobStatusSync', () => {
  it('should use getRayJobStatusSync for RayJobs', () => {
    const job = mockRayJobK8sResource({
      jobDeploymentStatus: RayJobDeploymentStatus.COMPLETE,
      jobStatus: RayJobStatusValue.SUCCEEDED,
    });
    expect(getUnifiedJobStatusSync(job)).toBe(RayJobState.SUCCEEDED);
  });

  it('should use getTrainingJobStatusSync for TrainJobs', () => {
    const job = mockTrainJobK8sResource({ status: TrainingJobState.RUNNING });
    expect(getUnifiedJobStatusSync(job)).toBe(TrainingJobState.RUNNING);
  });
});

describe('getRayJobStatusAlert', () => {
  describe('states that return null', () => {
    it('should return null for RUNNING', () => {
      const job = mockRayJobK8sResource({});
      expect(getRayJobStatusAlert(RayJobState.RUNNING, job)).toBeNull();
    });

    it('should return null for PAUSED', () => {
      const job = mockRayJobK8sResource({});
      expect(getRayJobStatusAlert(RayJobState.PAUSED, job)).toBeNull();
    });

    it('should return null for SUCCEEDED', () => {
      const job = mockRayJobK8sResource({});
      expect(getRayJobStatusAlert(RayJobState.SUCCEEDED, job)).toBeNull();
    });

    it('should return null for QUEUED without CR message', () => {
      const job = mockRayJobK8sResource({});
      expect(getRayJobStatusAlert(RayJobState.QUEUED, job)).toBeNull();
    });

    it('should return null for PENDING without CR message', () => {
      const job = mockRayJobK8sResource({});
      expect(getRayJobStatusAlert(RayJobState.PENDING, job)).toBeNull();
    });
  });

  describe('FAILED state', () => {
    it('should return danger alert using CR reason and message as layer 1', () => {
      const job = mockRayJobK8sResource({});
      job.status = { ...job.status, reason: 'RuntimeError', message: 'Script crashed at line 42' };

      const result = getRayJobStatusAlert(RayJobState.FAILED, job);

      expect(result).not.toBeNull();
      expect(result?.variant).toBe('danger');
      expect(result?.title).toBe('RuntimeError');
      expect(result?.description).toBe('Script crashed at line 42');
    });

    it('should fall back to workload Failed condition when CR fields are empty', () => {
      const job = mockRayJobK8sResource({});
      const workloadConditions: WorkloadCondition[] = [
        makeWorkloadCondition({
          type: WorkloadConditionType.Finished,
          status: ConditionStatus.True,
          reason: 'WorkloadFailed',
          message: 'Job failed due to resource limits',
        }),
      ];

      const result = getRayJobStatusAlert(RayJobState.FAILED, job, workloadConditions);

      expect(result?.variant).toBe('danger');
      expect(result?.title).toBe('WorkloadFailed');
      expect(result?.description).toBe('Job failed due to resource limits');
    });

    it('should prioritize CR reason over workload condition', () => {
      const job = mockRayJobK8sResource({});
      job.status = { ...job.status, reason: 'CRReason', message: 'CR message' };
      const workloadConditions: WorkloadCondition[] = [
        makeWorkloadCondition({
          type: WorkloadConditionType.Finished,
          status: ConditionStatus.True,
          reason: 'WorkloadReason',
          message: 'Workload message',
        }),
      ];

      const result = getRayJobStatusAlert(RayJobState.FAILED, job, workloadConditions);

      expect(result?.title).toBe('CRReason');
      expect(result?.description).toBe('CR message');
    });

    it('should use fallback title when CR and workload conditions are both empty', () => {
      const job = mockRayJobK8sResource({});
      const result = getRayJobStatusAlert(RayJobState.FAILED, job);

      expect(result?.variant).toBe('danger');
      expect(result?.title).toBeTruthy();
    });
  });

  describe('INADMISSIBLE state', () => {
    it('should return warning alert using CR reason and message', () => {
      const job = mockRayJobK8sResource({});
      job.status = { ...job.status, reason: 'Inadmissible', message: 'Insufficient quota' };

      const result = getRayJobStatusAlert(RayJobState.INADMISSIBLE, job);

      expect(result?.variant).toBe('warning');
      expect(result?.title).toBe('Inadmissible');
      expect(result?.description).toBe('Insufficient quota');
    });

    it('should fall back to workload Inadmissible condition when CR fields are empty', () => {
      const job = mockRayJobK8sResource({});
      const workloadConditions: WorkloadCondition[] = [
        makeWorkloadCondition({
          type: WorkloadConditionType.QuotaReserved,
          status: ConditionStatus.False,
          reason: 'Inadmissible',
          message: 'ClusterQueue is inactive',
        }),
      ];

      const result = getRayJobStatusAlert(RayJobState.INADMISSIBLE, job, workloadConditions);

      expect(result?.variant).toBe('warning');
      expect(result?.title).toBe('Inadmissible');
      expect(result?.description).toBe('ClusterQueue is inactive');
    });
  });

  describe('PREEMPTED state', () => {
    it('should return warning alert using CR reason and message', () => {
      const job = mockRayJobK8sResource({});
      job.status = { ...job.status, reason: 'Preempted', message: 'Higher priority workload' };

      const result = getRayJobStatusAlert(RayJobState.PREEMPTED, job);

      expect(result?.variant).toBe('warning');
      expect(result?.title).toBe('Preempted');
      expect(result?.description).toBe('Higher priority workload');
    });

    it('should fall back to workload Evicted condition when CR fields are empty', () => {
      const job = mockRayJobK8sResource({});
      const workloadConditions: WorkloadCondition[] = [
        makeWorkloadCondition({
          type: WorkloadConditionType.Evicted,
          status: ConditionStatus.True,
          reason: 'EvictedByPreemption',
          message: 'Preempted by higher priority job',
        }),
      ];

      const result = getRayJobStatusAlert(RayJobState.PREEMPTED, job, workloadConditions);

      expect(result?.variant).toBe('warning');
      expect(result?.title).toBe('EvictedByPreemption');
      expect(result?.description).toBe('Preempted by higher priority job');
    });

    it('should fall back to workload Preempted condition when no Evicted condition', () => {
      const job = mockRayJobK8sResource({});
      const workloadConditions: WorkloadCondition[] = [
        makeWorkloadCondition({
          type: WorkloadConditionType.Preempted,
          status: ConditionStatus.True,
          reason: 'PreemptedByFairSharing',
          message: 'Workload preempted by fair sharing',
        }),
      ];

      const result = getRayJobStatusAlert(RayJobState.PREEMPTED, job, workloadConditions);

      expect(result?.variant).toBe('warning');
      expect(result?.title).toBe('PreemptedByFairSharing');
    });
  });

  describe('QUEUED / PENDING info alerts', () => {
    it('should return info alert for QUEUED when CR has a message', () => {
      const job = mockRayJobK8sResource({});
      job.status = { ...job.status, reason: 'Waiting', message: 'Waiting for quota' };

      const result = getRayJobStatusAlert(RayJobState.QUEUED, job);

      expect(result?.variant).toBe('info');
      expect(result?.title).toBe('Waiting');
      expect(result?.description).toBe('Waiting for quota');
    });

    it('should return info alert for PENDING when CR has a message', () => {
      const job = mockRayJobK8sResource({});
      job.status = { ...job.status, reason: 'Initializing', message: 'Cluster is initializing' };

      const result = getRayJobStatusAlert(RayJobState.PENDING, job);

      expect(result?.variant).toBe('info');
      expect(result?.description).toBe('Cluster is initializing');
    });

    it('should use status label as title when CR has message but no reason', () => {
      const job = mockRayJobK8sResource({});
      job.status = { ...job.status, reason: undefined, message: 'Some info message' };

      const result = getRayJobStatusAlert(RayJobState.QUEUED, job);

      expect(result?.variant).toBe('info');
      expect(result?.title).toBeTruthy();
      expect(result?.description).toBe('Some info message');
    });
  });
});
