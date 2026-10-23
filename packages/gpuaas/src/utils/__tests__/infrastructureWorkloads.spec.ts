import {
  k8sListResource,
  type K8sResourceCommon,
  type K8sResourceListResult,
} from '@openshift/dynamic-plugin-sdk-utils';
import { listInferenceService } from '@odh-dashboard/internal/api/k8s/inferenceServices';
import { getHardwareProfile } from '@odh-dashboard/internal/api/k8s/hardwareProfiles';
import { listWorkloads } from '@odh-dashboard/internal/api/k8s/workloads';
import { TrainJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import {
  IdentifierResourceType,
  SchedulingType,
  type WorkloadCondition,
  type HardwareProfileKind,
  type WorkloadKind,
} from '@odh-dashboard/k8s-core';
import { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';
import type { TrainJobKind } from '@odh-dashboard/model-training/k8sTypes';
import { TrainingJobState } from '@odh-dashboard/model-training/types';
import {
  getInfrastructureJobStatus,
  listInfrastructureWorkloads,
} from '../infrastructureWorkloads';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/api/k8s/hardwareProfiles', () => ({
  getHardwareProfile: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/api/k8s/inferenceServices', () => ({
  listInferenceService: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/api/k8s/workloads', () => ({
  listWorkloads: jest.fn(),
  buildWorkloadMapForDeployments: jest.fn(() => ({})),
  buildWorkloadMapForNotebooks: jest.fn(() => ({})),
}));

jest.mock('@odh-dashboard/model-training/status', () => ({
  ...jest.requireActual('@odh-dashboard/model-training/status'),
  getTrainingJobStatusSync: jest.fn(() => 'Created'),
  getRayJobStatusSync: jest.fn(),
}));

const k8sListResourceMock = jest.mocked(k8sListResource);
const getHardwareProfileMock = jest.mocked(getHardwareProfile);
const listInferenceServiceMock = jest.mocked(listInferenceService);
const listWorkloadsMock = jest.mocked(listWorkloads);

const hardwareProfile: HardwareProfileKind = {
  apiVersion: 'infrastructure.opendatahub.io/v1',
  kind: 'HardwareProfile',
  metadata: {
    name: 'manual-kueue-lifecycle-hp',
    namespace: 'redhat-ods-applications',
    annotations: {
      'opendatahub.io/display-name': 'Manual Kueue Lifecycle Profile',
    },
  },
  spec: {
    identifiers: [
      {
        identifier: 'nvidia.com/gpu',
        displayName: 'GPU',
        resourceType: IdentifierResourceType.ACCELERATOR,
        minCount: 1,
        maxCount: 1,
        defaultCount: 1,
      },
    ],
    scheduling: {
      type: SchedulingType.NODE,
      node: { tolerations: [], nodeSelector: {} },
    },
  },
};

const trainJob = {
  apiVersion: 'trainer.kubeflow.org/v1beta1',
  kind: 'TrainJob',
  metadata: {
    name: 'kanishka-test',
    namespace: 'project-a',
    annotations: {
      'opendatahub.io/hardware-profile-name': hardwareProfile.metadata.name,
      'opendatahub.io/hardware-profile-namespace': hardwareProfile.metadata.namespace,
    },
  },
  spec: {},
  status: {},
};

const workload = (conditions: WorkloadCondition[]): WorkloadKind => ({
  apiVersion: 'kueue.x-k8s.io/v1beta2',
  kind: 'Workload',
  metadata: { name: 'train-job-workload', namespace: 'project-a' },
  spec: { active: true, podSets: [], queueName: 'default-queue' },
  status: { conditions },
});

const getTrainingJobStatusSyncMock = jest.mocked(
  jest.requireMock('@odh-dashboard/model-training/status').getTrainingJobStatusSync,
);

describe('listInfrastructureWorkloads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    k8sListResourceMock.mockImplementation(({ model }) => {
      if (model === TrainJobModel) {
        return Promise.resolve({
          apiVersion: 'v1',
          metadata: { resourceVersion: '', continue: '' },
          items: [trainJob as K8sResourceCommon],
        } as K8sResourceListResult<K8sResourceCommon>);
      }
      return Promise.resolve({
        apiVersion: 'v1',
        metadata: { resourceVersion: '', continue: '' },
        items: [],
      } as K8sResourceListResult<K8sResourceCommon>);
    });
    listInferenceServiceMock.mockResolvedValue([]);
    listWorkloadsMock.mockResolvedValue([]);
    getHardwareProfileMock.mockResolvedValue(hardwareProfile);
  });

  it('should use the referenced HardwareProfile display name in the Infrastructure row', async () => {
    const result = await listInfrastructureWorkloads('project-a', 'Project-A', false);

    expect(result.workloads).toHaveLength(1);
    expect(result.workloads[0]).toMatchObject({
      name: 'kanishka-test',
      hardwareProfile: 'Manual Kueue Lifecycle Profile',
      hardwareProfileResourceType: 'nvidia.com/gpu',
    });
    expect(result.workloads[0].hardwareProfile).not.toBe(hardwareProfile.metadata.name);
    expect(result.workloads[0].hardwareProfile).not.toBe('manual-lifecycle-lq');
    expect(getHardwareProfileMock).toHaveBeenCalledWith(
      hardwareProfile.metadata.name,
      hardwareProfile.metadata.namespace,
    );
  });
});

describe('getInfrastructureJobStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    {
      name: 'failed suspended TrainJob',
      status: TrainingJobState.FAILED,
      job: { spec: { suspend: true } },
    },
    {
      name: 'failed TrainJob with active jobs',
      status: TrainingJobState.FAILED,
      job: { status: { jobsStatus: [{ active: 1 }] } },
    },
    {
      name: 'succeeded suspended TrainJob',
      status: TrainingJobState.SUCCEEDED,
      job: { spec: { suspend: true } },
    },
    {
      name: 'deleting TrainJob with active jobs',
      status: TrainingJobState.DELETING,
      job: {
        metadata: { deletionTimestamp: new Date().toISOString() },
        status: { jobsStatus: [{ active: 1 }] },
      },
    },
  ])('should preserve the terminal status for a $name', ({ status, job }) => {
    getTrainingJobStatusSyncMock.mockReturnValue(status);

    expect(getInfrastructureJobStatus({ ...trainJob, ...job } as TrainJobKind, null)).toBe(status);
  });

  it.each([
    {
      name: 'failed TrainJob with queued Kueue status',
      status: TrainingJobState.FAILED,
      kueueStatus: KueueWorkloadStatus.Queued,
    },
    {
      name: 'succeeded TrainJob with queued Kueue status',
      status: TrainingJobState.SUCCEEDED,
      kueueStatus: KueueWorkloadStatus.Queued,
    },
    {
      name: 'deleting TrainJob with queued Kueue status',
      status: TrainingJobState.DELETING,
      kueueStatus: KueueWorkloadStatus.Queued,
    },
  ])('should preserve the terminal TrainJob status for a $name', ({ status, kueueStatus }) => {
    getTrainingJobStatusSyncMock.mockReturnValue(status);

    expect(
      getInfrastructureJobStatus(trainJob as unknown as TrainJobKind, { status: kueueStatus }),
    ).toBe(status);
  });

  it('should preserve Kueue Inadmissible precedence over a failed TrainJob', () => {
    getTrainingJobStatusSyncMock.mockReturnValue(TrainingJobState.FAILED);

    expect(
      getInfrastructureJobStatus(trainJob as unknown as TrainJobKind, {
        status: KueueWorkloadStatus.Inadmissible,
      }),
    ).toBe(TrainingJobState.INADMISSIBLE);
  });

  it('should use the full Workload status resolver for a matched TrainJob', () => {
    const job = {
      ...trainJob,
      status: { conditions: [], jobsStatus: [] },
    } as unknown as TrainJobKind;
    getTrainingJobStatusSyncMock.mockReturnValue(TrainingJobState.CREATED);

    expect(
      getInfrastructureJobStatus(
        job,
        { status: KueueWorkloadStatus.Queued },
        workload([
          {
            type: 'QuotaReserved',
            status: 'False',
            reason: 'Inadmissible',
            message: 'ClusterQueue is inactive',
            lastTransitionTime: '2024-01-15T10:30:00Z',
          },
        ]),
      ),
    ).toBe(TrainingJobState.INADMISSIBLE);
  });

  it('should retain the summarized Kueue fallback when no Workload matches', () => {
    getTrainingJobStatusSyncMock.mockReturnValue(TrainingJobState.CREATED);

    expect(
      getInfrastructureJobStatus(trainJob as unknown as TrainJobKind, {
        status: KueueWorkloadStatus.Queued,
      }),
    ).toBe(TrainingJobState.QUEUED);
  });
});
