import { mockRayJobK8sResource } from '../../../__mocks__/mockRayJobK8sResource';
import { mockTrainJobK8sResource } from '../../../__mocks__/mockTrainJobK8sResource';
import { TrainingJobState, RayJobDeploymentStatus, RayJobStatusValue } from '../../../types';
import {
  getRayJobStatusSync,
  getRayJobNodeCount,
  getUnifiedJobNodeCount,
  getUnifiedJobStatusSync,
} from '../utils';

describe('getRayJobStatusSync', () => {
  it('should return DELETING when deletionTimestamp is set', () => {
    const job = mockRayJobK8sResource({ isDeleting: true });
    expect(getRayJobStatusSync(job)).toBe(TrainingJobState.DELETING);
  });

  it('should return SUCCEEDED when Complete + SUCCEEDED', () => {
    const job = mockRayJobK8sResource({
      jobDeploymentStatus: RayJobDeploymentStatus.COMPLETE,
      jobStatus: RayJobStatusValue.SUCCEEDED,
    });
    expect(getRayJobStatusSync(job)).toBe(TrainingJobState.SUCCEEDED);
  });

  it('should return FAILED when deployment status is Failed', () => {
    const job = mockRayJobK8sResource({
      jobDeploymentStatus: RayJobDeploymentStatus.FAILED,
      jobStatus: RayJobStatusValue.FAILED,
    });
    expect(getRayJobStatusSync(job)).toBe(TrainingJobState.FAILED);
  });

  it('should return PAUSED when Suspended', () => {
    const job = mockRayJobK8sResource({
      jobDeploymentStatus: RayJobDeploymentStatus.SUSPENDED,
    });
    expect(getRayJobStatusSync(job)).toBe(TrainingJobState.PAUSED);
  });

  it('should return RUNNING when job status is RUNNING', () => {
    const job = mockRayJobK8sResource({
      jobStatus: RayJobStatusValue.RUNNING,
      jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
    });
    expect(getRayJobStatusSync(job)).toBe(TrainingJobState.RUNNING);
  });

  it('should return CREATED when Initializing', () => {
    const job = mockRayJobK8sResource({
      jobDeploymentStatus: RayJobDeploymentStatus.INITIALIZING,
      jobStatus: undefined,
    });
    expect(getRayJobStatusSync(job)).toBe(TrainingJobState.CREATED);
  });

  it('should return QUEUED when Waiting', () => {
    const job = mockRayJobK8sResource({
      jobDeploymentStatus: RayJobDeploymentStatus.WAITING,
      jobStatus: undefined,
    });
    expect(getRayJobStatusSync(job)).toBe(TrainingJobState.QUEUED);
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
    expect(getUnifiedJobStatusSync(job)).toBe(TrainingJobState.SUCCEEDED);
  });

  it('should use getTrainingJobStatusSync for TrainJobs', () => {
    const job = mockTrainJobK8sResource({ status: TrainingJobState.RUNNING });
    expect(getUnifiedJobStatusSync(job)).toBe(TrainingJobState.RUNNING);
  });
});
