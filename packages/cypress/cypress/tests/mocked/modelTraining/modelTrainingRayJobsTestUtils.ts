/* eslint-disable camelcase */
import { mockTrainJobK8sResourceList } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import { mockRayJobK8sResourceList } from '@odh-dashboard/model-training/__mocks__/mockRayJobK8sResource';
import { mockRayClusterK8sResource } from '@odh-dashboard/model-training/__mocks__/mockRayClusterK8sResource';
import {
  TrainingJobState,
  RayJobDeploymentStatus,
  RayJobStatusValue,
} from '@odh-dashboard/model-training/types';
import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mockPodK8sResource } from '@odh-dashboard/internal/__mocks__/mockPodK8sResource';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockLocalQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockLocalQueueK8sResource';
import { mockClusterQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockClusterQueueK8sResource';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import { WorkloadStatusType } from '@odh-dashboard/internal/concepts/distributedWorkloads/utils';
import {
  ClusterQueueModel,
  LocalQueueModel,
  RayClusterModel,
  RayJobModel,
  TrainJobModel,
  WorkloadModel,
} from '@odh-dashboard/internal/api/models';
import { ProjectModel, PodModel } from '../../../utils/models';

export const projectName = 'test-rayjobs-project';
export const projectDisplayName = 'Test RayJobs Project';
const KUEUE_QUEUE_LABEL = 'kueue.x-k8s.io/queue-name';
const KUEUE_JOB_UID_LABEL = 'kueue.x-k8s.io/job-uid';
const KUEUE_JOB_NAME_LABEL = 'kueue.x-k8s.io/job-name';

export const mockTrainJobs = mockTrainJobK8sResourceList([
  {
    name: 'train-job-one',
    namespace: projectName,
    status: TrainingJobState.RUNNING,
    numNodes: 4,
    localQueueName: 'default-queue',
    creationTimestamp: '2024-01-15T10:30:00Z',
  },
]);

export const mockRayJobs = mockRayJobK8sResourceList([
  {
    name: 'ray-data-processing',
    namespace: projectName,
    jobStatus: RayJobStatusValue.RUNNING,
    jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
    entrypoint: 'python process_data.py',
  },
  {
    name: 'ray-completed-job',
    namespace: projectName,
    jobStatus: RayJobStatusValue.SUCCEEDED,
    jobDeploymentStatus: RayJobDeploymentStatus.COMPLETE,
    rayClusterName: null,
    succeeded: 1,
  },
  {
    name: 'ray-failed-job',
    namespace: projectName,
    jobStatus: RayJobStatusValue.FAILED,
    jobDeploymentStatus: RayJobDeploymentStatus.FAILED,
    failed: 1,
    reason: 'AppFailed',
    message: 'Ray job failed due to application error.',
  },
  {
    name: 'ray-suspended-job',
    namespace: projectName,
    suspend: true,
    jobDeploymentStatus: RayJobDeploymentStatus.SUSPENDED,
  },
  {
    name: 'ray-multi-group-job',
    namespace: projectName,
    jobStatus: RayJobStatusValue.RUNNING,
    jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
    entrypoint: 'python multi_worker.py',
    additionalLabels: { 'kueue.x-k8s.io/queue-name': 'default-queue' },
    workerGroupSpecs: [
      {
        groupName: 'gpu-workers',
        replicas: 2,
        minReplicas: 1,
        maxReplicas: 4,
        template: {
          spec: {
            containers: [
              {
                name: 'ray-worker',
                resources: {
                  requests: { cpu: '2', memory: '4Gi' },
                  limits: { cpu: '4', memory: '8Gi', 'nvidia.com/gpu': '1' },
                },
              },
            ],
          },
        },
      },
      {
        groupName: 'cpu-workers',
        replicas: 3,
        minReplicas: 1,
        maxReplicas: 6,
        template: {
          spec: {
            containers: [
              {
                name: 'ray-worker',
                resources: {
                  requests: { cpu: '1', memory: '2Gi' },
                  limits: { cpu: '2', memory: '4Gi' },
                },
              },
            ],
          },
        },
      },
    ],
  },
  {
    name: 'ray-persist-cluster-job',
    namespace: projectName,
    jobStatus: RayJobStatusValue.RUNNING,
    jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
    shutdownAfterJobFinishes: false,
    entrypoint: 'python interactive.py',
  },
  {
    name: 'ray-workspace-job',
    namespace: projectName,
    jobStatus: RayJobStatusValue.RUNNING,
    jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
    clusterSelector: { 'ray.io/cluster': 'shared-ray-cluster' },
    rayClusterName: 'shared-ray-cluster',
    entrypoint: 'python workspace_train.py',
  },
  {
    name: 'ray-pending-job',
    namespace: projectName,
    jobDeploymentStatus: RayJobDeploymentStatus.INITIALIZING,
    clusterSelector: { 'ray.io/cluster': 'shared-ray-cluster' },
    rayClusterName: 'shared-ray-cluster',
    entrypoint: 'python workspace_train.py',
    jobStatus: undefined,
  },
  {
    name: 'ray-queued-job',
    namespace: projectName,
    jobDeploymentStatus: RayJobDeploymentStatus.WAITING,
    jobStatus: undefined,
  },
  {
    name: 'ray-deleting-job',
    namespace: projectName,
    isDeleting: true,
    jobStatus: RayJobStatusValue.RUNNING,
    jobDeploymentStatus: RayJobDeploymentStatus.RUNNING,
  },
  {
    name: 'ray-inadmissible-kueue',
    namespace: projectName,
    additionalLabels: { [KUEUE_QUEUE_LABEL]: 'default-queue' },
    jobDeploymentStatus: RayJobDeploymentStatus.INITIALIZING,
    jobStatus: undefined,
  },
  {
    name: 'ray-preempted-kueue',
    namespace: projectName,
    additionalLabels: { [KUEUE_QUEUE_LABEL]: 'default-queue' },
    jobDeploymentStatus: RayJobDeploymentStatus.INITIALIZING,
    jobStatus: undefined,
  },
  {
    name: 'ray-queued-kueue',
    namespace: projectName,
    additionalLabels: { [KUEUE_QUEUE_LABEL]: 'default-queue' },
    jobDeploymentStatus: RayJobDeploymentStatus.WAITING,
    jobStatus: undefined,
  },
  {
    name: 'ray-pending-kueue',
    namespace: projectName,
    additionalLabels: { [KUEUE_QUEUE_LABEL]: 'default-queue' },
    jobDeploymentStatus: RayJobDeploymentStatus.WAITING,
    jobStatus: undefined,
  },
]);

// Build workloads for each Kueue-managed RayJob, linking by job UID + name labels.
// This mirrors the pattern in modelTraining.cy.ts so the frontend's label-selector
// lookup resolves to the correct workload in both real and mocked environments.
const kueueWorkloadStatusMap: Record<string, WorkloadStatusType> = {
  'ray-inadmissible-kueue': WorkloadStatusType.Inadmissible,
  'ray-preempted-kueue': WorkloadStatusType.Evicted,
  'ray-queued-kueue': WorkloadStatusType.Pending,
  'ray-pending-kueue': WorkloadStatusType.Admitted, // overridden below to QuotaReserved=True only
};

const mockRayJobWorkloads = mockRayJobs
  .filter((job) => job.metadata.labels?.[KUEUE_QUEUE_LABEL])
  .map((job) => {
    const workloadStatus = kueueWorkloadStatusMap[job.metadata.name];
    const workload = mockWorkloadK8sResource({
      k8sName: `workload-${job.metadata.name}`,
      namespace: job.metadata.namespace,
      mockStatus: workloadStatus,
    });

    // Override conditions for Pending-kueue: QuotaReserved=True but no PodsReady
    // This drives the "Pending" display path (quota reserved, pods not yet scheduled)
    if (job.metadata.name === 'ray-pending-kueue' && workload.status) {
      workload.status.conditions = [
        {
          lastTransitionTime: '2024-03-18T19:15:28Z',
          message: 'Quota reserved in ClusterQueue test-cluster-queue',
          reason: 'QuotaReserved',
          status: 'True',
          type: 'QuotaReserved',
        },
      ];
    }

    return {
      ...workload,
      metadata: {
        ...workload.metadata,
        labels: {
          ...(workload.metadata?.labels ?? {}),
          [KUEUE_JOB_UID_LABEL]: job.metadata.uid ?? `uid-${job.metadata.name}`,
          [KUEUE_JOB_NAME_LABEL]: job.metadata.name,
        },
      },
    };
  });

const mockLocalQueues = [
  mockLocalQueueK8sResource({
    name: 'default-queue',
    namespace: projectName,
  }),
];

const mockClusterQueues = [
  mockClusterQueueK8sResource({
    name: 'test-cluster-queue',
  }),
];

export const initIntercepts = (): void => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      trainingJobs: true,
    }),
  );

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({
        k8sName: projectName,
        displayName: projectDisplayName,
        enableKueue: true,
      }),
    ]),
  );

  cy.interceptK8sList(
    {
      model: TrainJobModel,
      ns: projectName,
    },
    mockK8sResourceList(mockTrainJobs),
  );

  cy.interceptK8sList(
    {
      model: RayJobModel,
      ns: projectName,
    },
    mockK8sResourceList(mockRayJobs),
  );

  cy.interceptK8sList(
    {
      model: LocalQueueModel,
      ns: projectName,
    },
    mockK8sResourceList(mockLocalQueues),
  );

  mockLocalQueues.forEach((queue) => {
    if (queue.metadata?.name) {
      cy.interceptK8s(
        {
          model: LocalQueueModel,
          ns: projectName,
          name: queue.metadata.name,
        },
        queue,
      );
    }
  });

  cy.interceptK8s({ model: ClusterQueueModel, name: 'test-cluster-queue' }, mockClusterQueues[0]);

  cy.interceptK8sList(
    { model: PodModel, ns: projectName },
    mockK8sResourceList([
      mockPodK8sResource({
        name: 'ray-data-processing-submitter-abc',
        namespace: projectName,
        labels: { 'batch.kubernetes.io/job-name': 'ray-data-processing' },
      }),
      mockPodK8sResource({
        name: 'ray-data-processing-raycluster-head-xyz',
        namespace: projectName,
        labels: {
          'ray.io/cluster': 'ray-data-processing-raycluster',
          'ray.io/node-type': 'head',
        },
      }),
      mockPodK8sResource({
        name: 'ray-data-processing-raycluster-worker-1',
        namespace: projectName,
        labels: {
          'ray.io/cluster': 'ray-data-processing-raycluster',
          'ray.io/node-type': 'worker',
          'ray.io/group': 'worker-group-1',
        },
      }),
    ]),
  );

  cy.interceptK8s(
    { model: RayClusterModel, ns: projectName, name: 'shared-ray-cluster' },
    mockRayClusterK8sResource({
      name: 'shared-ray-cluster',
      namespace: projectName,
      rayVersion: '2.40.0',
    }),
  );
  mockRayJobs
    .filter((job) => job.metadata.labels?.[KUEUE_QUEUE_LABEL])
    .forEach((job) => {
      const matchingWorkload = mockRayJobWorkloads.find(
        (w) =>
          w.metadata.labels[KUEUE_JOB_UID_LABEL] === job.metadata.uid ||
          w.metadata.labels[KUEUE_JOB_NAME_LABEL] === job.metadata.name,
      );

      if (matchingWorkload && job.metadata.uid) {
        cy.interceptK8sList(
          {
            model: WorkloadModel,
            ns: projectName,
            queryParams: {
              labelSelector: `${KUEUE_JOB_UID_LABEL}=${job.metadata.uid}`,
            },
          },
          mockK8sResourceList([matchingWorkload]),
        );
      }

      if (matchingWorkload) {
        cy.interceptK8sList(
          {
            model: WorkloadModel,
            ns: projectName,
            queryParams: {
              labelSelector: `${KUEUE_JOB_NAME_LABEL}=${job.metadata.name}`,
            },
          },
          mockK8sResourceList([matchingWorkload]),
        );
      }
    });

  cy.intercept('GET', '**/ray-job-logs/*/*/*/*', {
    body: 'Sample RayJob driver log output\nLine 2 of logs',
  });
};

const createWorkloadForRayJob = (
  job: (typeof mockRayJobs)[number],
  overrides: { active?: boolean } = {},
) => {
  const workload = mockWorkloadK8sResource({
    k8sName: `workload-${job.metadata.name}`,
    namespace: projectName,
    mockStatus: WorkloadStatusType.Running,
  });
  workload.spec = {
    ...workload.spec,
    ...('active' in overrides ? { active: overrides.active } : {}),
  };
  if (workload.metadata) {
    workload.metadata.labels = {
      ...(workload.metadata.labels || {}),
      'kueue.x-k8s.io/job-uid': job.metadata.uid || `uid-${job.metadata.name}`,
      'kueue.x-k8s.io/job-name': job.metadata.name,
    };
  }
  return workload;
};

export const runningWorkload = createWorkloadForRayJob(mockRayJobs[0]);
export const suspendedWorkload = createWorkloadForRayJob(mockRayJobs[3], { active: false });
export const runningJobUid = mockRayJobs[0].metadata.uid ?? '';
export const suspendedJobUid = mockRayJobs[3].metadata.uid ?? '';

export const initPauseResumeIntercepts = (): void => {
  initIntercepts();

  cy.interceptK8sList(
    { model: WorkloadModel, ns: projectName },
    mockK8sResourceList([runningWorkload, suspendedWorkload]),
  );

  cy.interceptK8sList(
    {
      model: WorkloadModel,
      ns: projectName,
      queryParams: { labelSelector: `kueue.x-k8s.io/job-uid=${runningJobUid}` },
    },
    mockK8sResourceList([runningWorkload]),
  );

  cy.interceptK8sList(
    {
      model: WorkloadModel,
      ns: projectName,
      queryParams: { labelSelector: `kueue.x-k8s.io/job-uid=${suspendedJobUid}` },
    },
    mockK8sResourceList([suspendedWorkload]),
  );
};
