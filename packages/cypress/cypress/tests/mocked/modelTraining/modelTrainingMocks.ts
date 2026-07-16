/* eslint-disable camelcase */
import { mockTrainJobK8sResourceList } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import { mockRayJobK8sResourceList } from '@odh-dashboard/model-training/__mocks__/mockRayJobK8sResource';
import { createMockEventsForTrainJob } from '@odh-dashboard/model-training/__mocks__/mockEventK8sResource';
import {
  TrainingJobState,
  RayJobDeploymentStatus,
  RayJobStatusValue,
} from '@odh-dashboard/model-training/types';
import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockLocalQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockLocalQueueK8sResource';
import { mockClusterQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockClusterQueueK8sResource';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import {
  ClusterQueueModel,
  EventModel,
  LocalQueueModel,
  RayJobModel,
  TrainJobModel,
  WorkloadModel,
} from '@odh-dashboard/internal/api/models';
import { ContainerResourceAttributes } from '@odh-dashboard/k8s-core';
import { WorkloadStatusType } from '@odh-dashboard/internal/concepts/distributedWorkloads/utils';
import { ProjectModel } from '../../../utils/models';

export const projectName = 'test-model-training-project';
export const projectDisplayName = 'Test Model Training Project';

export const mockTrainJobs = mockTrainJobK8sResourceList([
  {
    name: 'image-classification-job',
    namespace: projectName,
    status: TrainingJobState.RUNNING,
    numNodes: 4,
    numProcPerNode: 1,
    localQueueName: 'training-queue',
    creationTimestamp: '2024-01-15T10:30:00Z',
    jobsStatus: [
      {
        name: 'node',
        active: 4,
        ready: 4,
        succeeded: 0,
        failed: 0,
        suspended: 0,
      },
    ],
  },
  {
    name: 'paused-training-job',
    namespace: projectName,
    status: TrainingJobState.PAUSED,
    numNodes: 2,
    localQueueName: 'paused-queue',
    creationTimestamp: '2024-01-19T12:00:00Z',
    suspend: true,
  },
  {
    name: 'nlp-model-training',
    namespace: projectName,
    status: TrainingJobState.SUCCEEDED,
    numNodes: 3,
    localQueueName: 'default-queue',
    creationTimestamp: '2024-01-14T08:15:00Z',
    jobsStatus: [
      {
        name: 'data-initializer',
        succeeded: 1,
        active: 0,
        failed: 0,
        ready: 0,
        suspended: 0,
      },
      {
        name: 'model-initializer',
        succeeded: 1,
        active: 0,
        failed: 0,
        ready: 0,
        suspended: 0,
      },
      {
        name: 'node',
        succeeded: 3,
        active: 0,
        failed: 0,
        ready: 0,
        suspended: 0,
      },
    ],
  },
  {
    name: 'failed-training-job',
    namespace: projectName,
    status: TrainingJobState.FAILED,
    numNodes: 2,
    localQueueName: 'urgent-queue',
    creationTimestamp: '2024-01-13T14:45:00Z',
  },
  {
    name: 'z-last-job',
    namespace: projectName,
    status: TrainingJobState.SUCCEEDED,
    numNodes: 2,
    localQueueName: 'z-queue',
    creationTimestamp: '2024-01-16T10:30:00Z',
  },
  {
    name: 'a-first-job',
    namespace: projectName,
    status: TrainingJobState.FAILED,
    numNodes: 6,
    localQueueName: 'a-queue',
    creationTimestamp: '2024-01-13T08:15:00Z',
  },
  {
    name: 'middle-job',
    namespace: projectName,
    status: TrainingJobState.RUNNING,
    numNodes: 4,
    localQueueName: 'middle-queue',
    creationTimestamp: '2024-01-15T14:45:00Z',
  },
  {
    name: 'gpu-training-job',
    namespace: projectName,
    status: TrainingJobState.RUNNING,
    numNodes: 2,
    localQueueName: 'gpu-queue',
    creationTimestamp: '2024-01-17T09:00:00Z',
  },
  {
    name: 'overconsumed-training-job',
    namespace: projectName,
    status: TrainingJobState.RUNNING,
    numNodes: 8,
    localQueueName: 'overconsumed-queue',
    creationTimestamp: '2024-01-18T10:00:00Z',
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
    succeeded: 1,
  },
]);

export const mockLocalQueues = [
  mockLocalQueueK8sResource({
    name: 'training-queue',
    namespace: projectName,
  }),
  mockLocalQueueK8sResource({
    name: 'paused-queue',
    namespace: projectName,
  }),
  mockLocalQueueK8sResource({
    name: 'default-queue',
    namespace: projectName,
  }),
  mockLocalQueueK8sResource({
    name: 'urgent-queue',
    namespace: projectName,
  }),
  mockLocalQueueK8sResource({
    name: 'z-queue',
    namespace: projectName,
  }),
  mockLocalQueueK8sResource({
    name: 'a-queue',
    namespace: projectName,
  }),
  mockLocalQueueK8sResource({
    name: 'middle-queue',
    namespace: projectName,
  }),
  {
    ...mockLocalQueueK8sResource({
      name: 'gpu-queue',
      namespace: projectName,
    }),
    spec: {
      clusterQueue: 'gpu-cluster-queue',
    },
  },
  {
    ...mockLocalQueueK8sResource({
      name: 'overconsumed-queue',
      namespace: projectName,
    }),
    spec: {
      clusterQueue: 'overconsumed-cluster-queue',
    },
  },
];

const createGPUClusterQueue = () => {
  const baseMock = mockClusterQueueK8sResource({ name: 'gpu-cluster-queue' });
  return {
    ...baseMock,
    spec: {
      ...baseMock.spec,
      cohortName: 'ml-training-cohort',
      resourceGroups: [
        {
          coveredResources: [
            ContainerResourceAttributes.CPU,
            ContainerResourceAttributes.MEMORY,
            'nvidia.com/gpu' as ContainerResourceAttributes,
          ],
          flavors: [
            {
              name: 'gpu-flavor',
              resources: [
                { name: ContainerResourceAttributes.CPU, nominalQuota: '200' },
                { name: ContainerResourceAttributes.MEMORY, nominalQuota: '128Gi' },
                { name: 'nvidia.com/gpu' as ContainerResourceAttributes, nominalQuota: '8' },
              ],
            },
          ],
        },
      ],
    },
    status: {
      ...baseMock.status,
      flavorsUsage: [
        {
          name: 'gpu-flavor',
          resources: [
            { name: ContainerResourceAttributes.CPU, total: '50' },
            { name: ContainerResourceAttributes.MEMORY, total: '32Gi' },
            { name: 'nvidia.com/gpu' as ContainerResourceAttributes, total: '2' },
          ],
        },
      ],
    },
  };
};

export const mockClusterQueues = [
  mockClusterQueueK8sResource({
    name: 'test-cluster-queue',
  }),
  createGPUClusterQueue(),
  mockClusterQueueK8sResource({
    name: 'overconsumed-cluster-queue',
    isCpuOverQuota: true,
    isMemoryOverQuota: true,
  }),
];

// Create mock workloads for each train job
// Map status from train job configs to workload status
export const trainJobStatusMap: Record<string, TrainingJobState> = {
  'image-classification-job': TrainingJobState.RUNNING,
  'paused-training-job': TrainingJobState.PAUSED,
  'nlp-model-training': TrainingJobState.SUCCEEDED,
  'failed-training-job': TrainingJobState.FAILED,
  'z-last-job': TrainingJobState.SUCCEEDED,
  'a-first-job': TrainingJobState.FAILED,
  'middle-job': TrainingJobState.RUNNING,
  'gpu-training-job': TrainingJobState.RUNNING,
  'overconsumed-training-job': TrainingJobState.RUNNING,
};

export const mockWorkloads = mockTrainJobs.map((job) => {
  const jobStatus = trainJobStatusMap[job.metadata.name] ?? TrainingJobState.RUNNING;
  let workloadStatus = WorkloadStatusType.Running;
  let workloadSpec = { active: true };

  if (jobStatus === TrainingJobState.FAILED) {
    workloadStatus = WorkloadStatusType.Failed;
  } else if (jobStatus === TrainingJobState.SUCCEEDED) {
    workloadStatus = WorkloadStatusType.Complete;
  } else if (jobStatus === TrainingJobState.PENDING) {
    workloadStatus = WorkloadStatusType.Pending;
  } else if (jobStatus === TrainingJobState.PAUSED) {
    workloadStatus = WorkloadStatusType.Running;
    workloadSpec = { active: false };
  }

  const workload = mockWorkloadK8sResource({
    k8sName: `workload-${job.metadata.name}`,
    namespace: job.metadata.namespace,
    mockStatus: workloadStatus,
  });

  // Add job UID and name labels to link workload to train job
  if (!workload.metadata) {
    throw new Error('Workload metadata is required');
  }

  // For Paused status, ensure workload has Admitted condition but active=false
  if (jobStatus === TrainingJobState.PAUSED && workload.status?.conditions) {
    workload.status.conditions = [
      {
        lastTransitionTime: '2024-03-18T19:15:28Z',
        message: 'The workload is admitted',
        reason: 'Admitted',
        status: 'True',
        type: 'Admitted',
      },
      {
        lastTransitionTime: '2024-03-18T19:15:28Z',
        message: 'Quota reserved in ClusterQueue paused-cluster-queue',
        reason: 'QuotaReserved',
        status: 'True',
        type: 'QuotaReserved',
      },
    ];
  }

  return {
    ...workload,
    spec: {
      ...workload.spec,
      ...workloadSpec,
    },
    metadata: {
      ...workload.metadata,
      labels: {
        ...(workload.metadata.labels || {}),
        'kueue.x-k8s.io/job-uid': job.metadata.uid || `uid-${job.metadata.name}`,
        'kueue.x-k8s.io/job-name': job.metadata.name,
      },
    },
  };
});

/**
 * Set up intercepts for status modal APIs for a specific job
 * This mocks the Workload and Event API calls that the modal makes
 */
export const initInterceptsForStatusModal = (
  trainJobName: string,
  namespace: string,
  trainJobUid?: string,
  workloadName?: string,
  workloadUid?: string,
): void => {
  // Note: Workload list intercepts are set up separately to handle label selector queries
  // This function only sets up Event intercepts for the status modal

  // Create events for this specific job
  const jobEvents = createMockEventsForTrainJob(
    trainJobName,
    namespace,
    trainJobUid,
    workloadName,
    workloadUid,
  );

  // Mock Event list for TrainJob events (fieldSelector: involvedObject.name=${trainJobName})
  cy.interceptK8sList(
    {
      model: EventModel,
      ns: namespace,
      queryParams: {
        fieldSelector: `involvedObject.name=${trainJobName}`,
      },
    },
    mockK8sResourceList(
      jobEvents.filter((e) => e.involvedObject.name === trainJobName && !e.involvedObject.kind),
    ),
  );

  // Mock Event list for Workload events (if workload exists)
  // fieldSelector: involvedObject.kind=Workload,involvedObject.name=${workloadName}
  if (workloadName) {
    cy.interceptK8sList(
      {
        model: EventModel,
        ns: namespace,
        queryParams: {
          fieldSelector: `involvedObject.kind=Workload,involvedObject.name=${workloadName}`,
        },
      },
      mockK8sResourceList(
        jobEvents.filter(
          (e) => e.involvedObject.kind === 'Workload' && e.involvedObject.name === workloadName,
        ),
      ),
    );
  }

  // Mock Event list for JobSet events
  // fieldSelector: involvedObject.kind=JobSet,involvedObject.name=${trainJobName}
  cy.interceptK8sList(
    {
      model: EventModel,
      ns: namespace,
      queryParams: {
        fieldSelector: `involvedObject.kind=JobSet,involvedObject.name=${trainJobName}`,
      },
    },
    mockK8sResourceList(
      jobEvents.filter(
        (e) => e.involvedObject.kind === 'JobSet' && e.involvedObject.name === trainJobName,
      ),
    ),
  );
};

export const initIntercepts = ({ isEmpty = false }: { isEmpty?: boolean } = {}): void => {
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
      mockProjectK8sResource({
        k8sName: 'other-project',
        displayName: 'Other Project',
        enableKueue: false,
      }),
    ]),
  );

  cy.interceptK8sList(
    {
      model: TrainJobModel,
      ns: projectName,
    },
    mockK8sResourceList(isEmpty ? [] : mockTrainJobs),
  );

  cy.interceptK8sList(
    {
      model: RayJobModel,
      ns: projectName,
    },
    mockK8sResourceList(isEmpty ? [] : mockRayJobs),
  );

  cy.interceptK8sList(
    {
      model: LocalQueueModel,
      ns: projectName,
    },
    mockK8sResourceList(isEmpty ? [] : mockLocalQueues),
  );

  if (!isEmpty) {
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
  }

  if (!isEmpty) {
    cy.interceptK8s({ model: ClusterQueueModel, name: 'test-cluster-queue' }, mockClusterQueues[0]);
    cy.interceptK8s({ model: ClusterQueueModel, name: 'gpu-cluster-queue' }, mockClusterQueues[1]);
    cy.interceptK8s(
      { model: ClusterQueueModel, name: 'overconsumed-cluster-queue' },
      mockClusterQueues[2],
    );

    // Mock Workload resources (used by status modal)
    cy.interceptK8sList(
      {
        model: WorkloadModel,
        ns: projectName,
      },
      mockK8sResourceList(mockWorkloads),
    );
  }
};
