/* eslint-disable camelcase */
import { mockTrainJobK8sResourceList } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import { createMockEventsForTrainJob } from '@odh-dashboard/model-training/__mocks__/mockEventK8sResource';
import { TrainingJobState } from '@odh-dashboard/model-training/types';
import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mockPodK8sResource } from '@odh-dashboard/internal/__mocks__/mockPodK8sResource';
import { mockPodLogs } from '@odh-dashboard/internal/__mocks__/mockPodLogs';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockLocalQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockLocalQueueK8sResource';
import { mockClusterQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockClusterQueueK8sResource';
import { mockWorkloadK8sResource } from '@odh-dashboard/internal/__mocks__/mockWorkloadK8sResource';
import {
  ClusterQueueModel,
  EventModel,
  LocalQueueModel,
  TrainJobModel,
  WorkloadModel,
} from '@odh-dashboard/internal/api/models';
import { ContainerResourceAttributes } from '@odh-dashboard/internal/types';
import { WorkloadStatusType } from '@odh-dashboard/internal/concepts/distributedWorkloads/utils';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import {
  modelTrainingGlobal,
  trainingJobTable,
  trainingJobDetailsDrawer,
  trainingJobResourcesTab,
  trainingJobPodsTab,
  trainingJobLogsTab,
  trainingJobStatusModal,
  scaleNodesModal,
} from '../../../pages/modelTraining';
import { deleteModal } from '../../../pages/components/DeleteModal';
import { tablePagination } from '../../../pages/components/Pagination';
import { ProjectModel, PodModel } from '../../../utils/models';

const projectName = 'test-model-training-project';
const projectDisplayName = 'Test Model Training Project';

const mockTrainJobs = mockTrainJobK8sResourceList([
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

const mockLocalQueues = [
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
      cohort: 'ml-training-cohort',
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

const mockClusterQueues = [
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
const trainJobStatusMap: Record<string, TrainingJobState> = {
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

const mockWorkloads = mockTrainJobs.map((job) => {
  const jobStatus = trainJobStatusMap[job.metadata.name] ?? TrainingJobState.RUNNING;
  let workloadStatus = WorkloadStatusType.Running;
  let workloadSpec = { active: true };

  if (jobStatus === TrainingJobState.FAILED) {
    workloadStatus = WorkloadStatusType.Failed;
  } else if (jobStatus === TrainingJobState.SUCCEEDED) {
    workloadStatus = WorkloadStatusType.Succeeded;
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
const initInterceptsForStatusModal = (
  trainJobName: string,
  namespace: string,
  trainJobUid?: string,
  workloadName?: string,
  workloadUid?: string,
) => {
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

const initIntercepts = ({ isEmpty = false }: { isEmpty?: boolean } = {}) => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      trainingJobs: true,
    }),
  );

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({ k8sName: projectName, displayName: projectDisplayName }),
      mockProjectK8sResource({ k8sName: 'other-project', displayName: 'Other Project' }),
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

describe('Model Training', () => {
  beforeEach(() => {
    asClusterAdminUser();
  });

  it('should display correct data in training job table rows', () => {
    initIntercepts();
    modelTrainingGlobal.visit(projectName);

    // Wait for the table to be visible (ensures page has loaded)
    trainingJobTable.findTable().should('be.visible');

    const imageClassificationRow = trainingJobTable.getTableRow('image-classification-job');
    imageClassificationRow.findTrainingJobName().should('contain', 'image-classification-job');
    imageClassificationRow.findProject().should('contain', projectDisplayName);
    imageClassificationRow.findNodes().should('contain', '4');
    imageClassificationRow.findClusterQueue().should('contain', 'test-cluster-queue');
    imageClassificationRow.findStatus().should('contain', TrainingJobState.RUNNING);
  });

  it('should show empty state when no training jobs exist', () => {
    initIntercepts({ isEmpty: true });
    modelTrainingGlobal.visit(projectName);

    modelTrainingGlobal.findEmptyState().should('contain', 'No training jobs');
    modelTrainingGlobal
      .findEmptyStateDescription()
      .should('contain', 'No training jobs have been found in this project.');
  });

  describe('Training Job Details Drawer', () => {
    it('should open drawer when clicking on a training job name', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      trainingJobDetailsDrawer.shouldBeClosed();

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
    });

    it('should navigate between tabs in the drawer', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('nlp-model-training');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();

      trainingJobDetailsDrawer.findTab('Resources').should('exist');
      trainingJobDetailsDrawer.findTab('Pods').should('exist');
      trainingJobDetailsDrawer.findTab('Logs').should('exist');

      trainingJobDetailsDrawer.selectTab('Resources');
      trainingJobDetailsDrawer.findActiveTabContent().should('contain', 'Node configurations');

      trainingJobDetailsDrawer.selectTab('Pods');
      trainingJobDetailsDrawer.findActiveTabContent().should('contain', 'Training pods');
    });

    it('should close drawer when clicking close button', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('failed-training-job');
      row.findNameLink().click();
      trainingJobDetailsDrawer.shouldBeOpen();

      trainingJobDetailsDrawer.close();
      trainingJobDetailsDrawer.shouldBeClosed();
    });

    it('should show kebab menu with delete option', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('a-first-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();

      trainingJobDetailsDrawer.clickKebabMenu();

      trainingJobDetailsDrawer.findKebabMenuItem('Delete').should('exist');
    });

    it('should switch between different jobs in the drawer', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const firstRow = trainingJobTable.getTableRow('image-classification-job');
      firstRow.findNameLink().click();
      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.findTitle().should('contain', 'image-classification-job');

      const secondRow = trainingJobTable.getTableRow('nlp-model-training');
      secondRow.findNameLink().click();

      trainingJobDetailsDrawer.findTitle().should('contain', 'nlp-model-training');
    });
  });

  describe('Resources Tab', () => {
    it('should display all sections in Resources tab', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      // Verify all sections are present
      trainingJobResourcesTab.findNodeConfigurationsSection().should('exist');
      trainingJobResourcesTab.findResourcesPerNodeSection().should('exist');
      trainingJobResourcesTab.findClusterQueueSection().should('exist');
      trainingJobResourcesTab.findQuotasSection().should('exist');
    });

    it('should display correct node configuration values', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      trainingJobResourcesTab.findNodesValue().should('contain', '4');
      trainingJobResourcesTab.findProcessesPerNodeValue().should('contain', '1');
      trainingJobResourcesTab.findNodesEditButton().should('exist');
    });

    it('should display correct resource values', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('nlp-model-training');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      trainingJobResourcesTab.findCpuRequestsValue().should('contain', '1');
      trainingJobResourcesTab.findCpuLimitsValue().should('contain', '2');
      trainingJobResourcesTab.findMemoryRequestsValue().should('contain', '2Gi');
      trainingJobResourcesTab.findMemoryLimitsValue().should('contain', '4Gi');
    });

    it('should display cluster queue information', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      trainingJobResourcesTab.findQueueValue().should('contain', 'test-cluster-queue');
    });

    it('should display quota source', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      trainingJobResourcesTab.findQuotaSourceValue().should('contain', '-');
    });

    it('should display CPU and Memory consumption', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      trainingJobResourcesTab.findCPUQuotaTotal().should('contain', '100');
      trainingJobResourcesTab.findCPUQuotaConsumed().should('contain', '40 (40%)');

      trainingJobResourcesTab.findMemoryQuotaTotal().should('contain', '64Gi');
      trainingJobResourcesTab.findMemoryQuotaConsumed().should('contain', '20Gi (31%)');
    });

    it('should display GPU consumption when available', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('gpu-training-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      // GPU cluster queue has: 200 CPU, 128Gi Memory, 8 GPU
      trainingJobResourcesTab.findCPUQuotaTotal().should('contain', '200');
      trainingJobResourcesTab.findCPUQuotaConsumed().should('contain', '50 (25%)');

      trainingJobResourcesTab.findMemoryQuotaTotal().should('contain', '128Gi');
      trainingJobResourcesTab.findMemoryQuotaConsumed().should('contain', '32Gi (25%)');

      trainingJobResourcesTab.findGPUQuotaTotal().should('contain', '8');
      trainingJobResourcesTab.findGPUQuotaConsumed().should('contain', '2 (25%)');
    });

    it('should display cohort when set', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('gpu-training-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      trainingJobResourcesTab.findQuotaSourceValue().should('contain', 'ml-training-cohort');
    });

    it('should display over-consumption correctly', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('overconsumed-training-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      trainingJobResourcesTab.findCPUQuotaConsumed().should('contain', '180 (180%)');
      trainingJobResourcesTab.findMemoryQuotaConsumed().should('contain', '100Gi (156%)');
    });

    it('should show dash when no consumed resources available', () => {
      initIntercepts();

      cy.interceptK8s(
        { model: ClusterQueueModel, name: 'test-cluster-queue' },
        {
          ...mockClusterQueueK8sResource({ name: 'test-cluster-queue' }),
          status: {
            flavorsUsage: [],
          },
        },
      );

      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      trainingJobResourcesTab.findConsumedQuotaValue().should('contain', '-');
    });

    it('should update resources tab when switching between jobs', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const firstRow = trainingJobTable.getTableRow('image-classification-job');
      firstRow.findNameLink().click();
      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');
      trainingJobResourcesTab.findNodesValue().should('contain', '4');

      const secondRow = trainingJobTable.getTableRow('nlp-model-training');
      secondRow.findNameLink().click();
      trainingJobResourcesTab.findNodesValue().should('contain', '3');

      const thirdRow = trainingJobTable.getTableRow('a-first-job');
      thirdRow.findNameLink().click();
      trainingJobResourcesTab.findNodesValue().should('contain', '6');
    });
  });

  describe('Pods Tab', () => {
    const mockPods = [
      mockPodK8sResource({
        name: 'image-classification-job-worker-0',
        namespace: projectName,
        isRunning: true,
        labels: {
          'jobset.sigs.k8s.io/jobset-name': 'image-classification-job',
        },
      }),
      mockPodK8sResource({
        name: 'image-classification-job-worker-1',
        namespace: projectName,
        isRunning: true,
        labels: {
          'jobset.sigs.k8s.io/jobset-name': 'image-classification-job',
        },
      }),
      mockPodK8sResource({
        name: 'image-classification-job-worker-2',
        namespace: projectName,
        isRunning: true,
        labels: {
          'jobset.sigs.k8s.io/jobset-name': 'image-classification-job',
        },
      }),
      mockPodK8sResource({
        name: 'image-classification-job-initializer-0',
        namespace: projectName,
        isRunning: false,
        isPending: true,
        labels: {
          'jobset.sigs.k8s.io/jobset-name': 'image-classification-job',
        },
      }),
    ];

    it('should display training pods in Pods tab', () => {
      initIntercepts();

      cy.interceptK8sList(
        {
          model: PodModel,
          ns: projectName,
          queryParams: { labelSelector: 'jobset.sigs.k8s.io/jobset-name=image-classification-job' },
        },
        mockK8sResourceList(mockPods),
      );

      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Pods');

      trainingJobPodsTab.findInitializersSection().should('exist');
      trainingJobPodsTab.findPodByName('image-classification-job-initializer-0').should('exist');

      trainingJobPodsTab.findTrainingPodsSection().should('exist');
      trainingJobPodsTab.findPodByName('image-classification-job-worker-0').should('exist');
      trainingJobPodsTab.findPodByName('image-classification-job-worker-1').should('exist');
      trainingJobPodsTab.findPodByName('image-classification-job-worker-2').should('exist');
    });

    it('should display pod status icons correctly', () => {
      initIntercepts();

      const mixedStatusPods = [
        mockPodK8sResource({
          name: 'running-pod',
          namespace: projectName,
          isRunning: true,
        }),
        mockPodK8sResource({
          name: 'pending-pod',
          namespace: projectName,
          isRunning: false,
          isPending: true,
        }),
      ];

      cy.interceptK8sList(
        {
          model: PodModel,
          ns: projectName,
        },
        mockK8sResourceList(mixedStatusPods),
      );

      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Pods');

      trainingJobPodsTab.findPodByName('running-pod').should('exist');
      trainingJobPodsTab.findPodByName('pending-pod').should('exist');
    });
  });

  describe('Logs Tab', () => {
    const mockTrainingPods = [
      mockPodK8sResource({
        name: 'image-classification-job-worker-0',
        namespace: projectName,
        isRunning: true,
      }),
      mockPodK8sResource({
        name: 'image-classification-job-worker-1',
        namespace: projectName,
        isRunning: true,
      }),
    ];

    it('should display logs for selected pod', () => {
      initIntercepts();

      cy.interceptK8sList(
        {
          model: PodModel,
          ns: projectName,
        },
        mockK8sResourceList(mockTrainingPods),
      );

      cy.interceptK8s(
        {
          model: PodModel,
          path: 'log',
          name: 'image-classification-job-worker-0',
          ns: projectName,
          queryParams: {
            container: 'image-classification-job-worker-0',
            tailLines: '500',
          },
        },
        mockPodLogs({
          namespace: projectName,
          podName: 'image-classification-job-worker-0',
          containerName: 'image-classification-job-worker-0',
        }),
      );

      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Logs');

      trainingJobLogsTab.findLogViewer().should('exist');
      trainingJobLogsTab
        .findLogContent()
        .should('contain', 'sample log for namespace test-model-training-project');
    });

    it('should allow switching between pods in log viewer', () => {
      initIntercepts();

      cy.interceptK8sList(
        {
          model: PodModel,
          ns: projectName,
        },
        mockK8sResourceList(mockTrainingPods),
      );

      cy.interceptK8s(
        {
          model: PodModel,
          path: 'log',
          name: 'image-classification-job-worker-0',
          ns: projectName,
          queryParams: {
            container: 'image-classification-job-worker-0',
            tailLines: '500',
          },
        },
        mockPodLogs({
          namespace: projectName,
          podName: 'image-classification-job-worker-0',
          containerName: 'image-classification-job-worker-0',
        }),
      );

      cy.interceptK8s(
        {
          model: PodModel,
          path: 'log',
          name: 'image-classification-job-worker-1',
          ns: projectName,
          queryParams: {
            container: 'image-classification-job-worker-1',
            tailLines: '500',
          },
        },
        mockPodLogs({
          namespace: projectName,
          podName: 'image-classification-job-worker-1',
          containerName: 'image-classification-job-worker-1',
        }),
      );

      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Logs');

      trainingJobLogsTab
        .findLogContent()
        .should('contain', 'pod name image-classification-job-worker-0');

      trainingJobLogsTab.selectPod('image-classification-job-worker-1');

      trainingJobLogsTab
        .findLogContent()
        .should('contain', 'pod name image-classification-job-worker-1');
    });

    it('should show empty state when no pods available for logs', () => {
      initIntercepts();

      cy.interceptK8sList(
        {
          model: PodModel,
          ns: projectName,
          queryParams: { labelSelector: 'jobset.sigs.k8s.io/jobset-name=image-classification-job' },
        },
        mockK8sResourceList([]),
      );

      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Logs');

      trainingJobLogsTab.findEmptyState().should('contain', 'No pods found');
    });

    it('should enable download button when logs are loaded', () => {
      initIntercepts();

      cy.interceptK8sList(
        {
          model: PodModel,
          ns: projectName,
        },
        mockK8sResourceList(mockTrainingPods),
      );

      cy.interceptK8s(
        {
          model: PodModel,
          path: 'log',
          name: 'image-classification-job-worker-0',
          ns: projectName,
          queryParams: {
            container: 'image-classification-job-worker-0',
            tailLines: '500',
          },
        },
        mockPodLogs({
          namespace: projectName,
          podName: 'image-classification-job-worker-0',
          containerName: 'image-classification-job-worker-0',
        }),
      );

      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Logs');

      trainingJobLogsTab.findDownloadButton().should('exist');
      trainingJobLogsTab.findDownloadButton().should('not.be.disabled');
    });

    it('should display loading state while fetching logs', () => {
      initIntercepts();

      cy.interceptK8sList(
        {
          model: PodModel,
          ns: projectName,
        },
        mockK8sResourceList(mockTrainingPods),
      );

      cy.interceptK8s(
        {
          model: PodModel,
          path: 'log',
          name: 'image-classification-job-worker-0',
          ns: projectName,
          queryParams: {
            container: 'image-classification-job-worker-0',
            tailLines: '500',
          },
        },
        {
          delay: 2000,
          body: mockPodLogs({
            namespace: projectName,
            podName: 'image-classification-job-worker-0',
            containerName: 'image-classification-job-worker-0',
          }),
        },
      ).as('fetchLogs');

      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Logs');

      trainingJobLogsTab.findLoadingSpinner().should('exist');

      cy.wait('@fetchLogs');
      trainingJobLogsTab.findLoadingSpinner().should('not.exist');
    });
  });

  describe('Training Job Status Modal', () => {
    beforeEach(() => {
      initIntercepts();

      // Set up Workload list intercepts with label selectors for each job
      // This handles requests from getWorkloadForTrainJob which uses label selectors
      mockTrainJobs.forEach((job) => {
        const matchingWorkload = mockWorkloads.find(
          (w) =>
            w.metadata.labels['kueue.x-k8s.io/job-uid'] === job.metadata.uid ||
            w.metadata.labels['kueue.x-k8s.io/job-name'] === job.metadata.name,
        );

        if (matchingWorkload && job.metadata.uid) {
          // Intercept for UID-based selector (most common)
          cy.interceptK8sList(
            {
              model: WorkloadModel,
              ns: projectName,
              queryParams: {
                labelSelector: `kueue.x-k8s.io/job-uid=${job.metadata.uid}`,
              },
            },
            mockK8sResourceList([matchingWorkload]),
          );
        }

        if (matchingWorkload) {
          // Intercept for name-based selector (fallback)
          cy.interceptK8sList(
            {
              model: WorkloadModel,
              ns: projectName,
              queryParams: {
                labelSelector: `kueue.x-k8s.io/job-name=${job.metadata.name}`,
              },
            },
            mockK8sResourceList([matchingWorkload]),
          );
        }
      });

      // Set up status modal intercepts for all jobs
      mockTrainJobs.forEach((job) => {
        const matchingWorkload = mockWorkloads.find(
          (w) =>
            w.metadata.labels['kueue.x-k8s.io/job-uid'] === job.metadata.uid ||
            w.metadata.labels['kueue.x-k8s.io/job-name'] === job.metadata.name,
        );
        initInterceptsForStatusModal(
          job.metadata.name,
          job.metadata.namespace || projectName,
          job.metadata.uid,
          matchingWorkload?.metadata.name,
          matchingWorkload?.metadata.uid,
        );
      });
    });

    it('should open status modal when clicking on status label', () => {
      modelTrainingGlobal.visit(projectName);
      trainingJobTable.findTable().should('be.visible');

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findStatus().should('be.visible').click();
      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.findTitle().should('be.visible');
      trainingJobStatusModal.findStatusLabel().should('be.visible');
    });

    it('should display Progress tab with tree view sections', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findStatus().click();

      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.findProgressTab().should('be.visible');

      trainingJobStatusModal.getModal().then(($modal) => {
        if ($modal.find('[data-testid="initialization-section"]').length > 0) {
          trainingJobStatusModal.findInitializationSection().should('be.visible');
        }
        if ($modal.find('[data-testid="training-section"]').length > 0) {
          trainingJobStatusModal.findTrainingSection().should('be.visible');
        }
      });
    });

    it('should switch between Progress and Events log tabs', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findStatus().click();

      trainingJobStatusModal.shouldBeOpen();

      trainingJobStatusModal.findProgressTab().should('have.attr', 'aria-selected', 'true');
      trainingJobStatusModal.selectTab('Events log');
      trainingJobStatusModal.findEventsLogTab().should('have.attr', 'aria-selected', 'true');
      trainingJobStatusModal.selectTab('Progress');
      trainingJobStatusModal.findProgressTab().should('have.attr', 'aria-selected', 'true');
    });

    it('should show Events log tab content', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findStatus().click();
      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.selectTab('Events log');
      trainingJobStatusModal.findEventLogs().should('be.visible');
    });

    it('should display pause button for running jobs', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findStatus().click();

      trainingJobStatusModal.shouldBeOpen();
      // TODO: RHOAIENG-37578 - Retry and Pause/Resume button tests commented out
      // trainingJobStatusModal.findPauseResumeButton().should('be.visible');
      // trainingJobStatusModal.findPauseResumeButton().should('contain', 'Pause Job');
    });

    it('should display retry button for failed jobs', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('failed-training-job');
      row.findStatus().click();

      trainingJobStatusModal.shouldBeOpen();
      // TODO: RHOAIENG-37578 - Retry and Pause/Resume button tests commented out
      // trainingJobStatusModal.findRetryButton().should('be.visible');
      // trainingJobStatusModal.findRetryButton().should('contain', 'Retry Job');
      // trainingJobStatusModal.findPauseResumeButton().should('not.exist');
    });

    it('should display delete button', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findStatus().click();

      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.findDeleteButton().should('be.visible');
      trainingJobStatusModal.findDeleteButton().should('contain', 'Delete Job');
    });

    it('should open delete modal when clicking delete button', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findStatus().click();

      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.findDeleteButton().click();

      deleteModal.shouldBeOpen();
    });

    it('should close modal when clicking close button', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findStatus().click();

      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.close();
      trainingJobStatusModal.shouldBeOpen(false);
    });

    it('should display correct status in modal header', () => {
      modelTrainingGlobal.visit(projectName);

      const runningRow = trainingJobTable.getTableRow('image-classification-job');
      runningRow.findStatus().click();
      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.getTrainingJobStatus(TrainingJobState.RUNNING);
      trainingJobStatusModal.close();
      const failedRow = trainingJobTable.getTableRow('failed-training-job');
      failedRow.findStatus().click();
      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.getTrainingJobStatus(TrainingJobState.FAILED);
    });

    it('should show tree view sections for jobs with initializers', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('nlp-model-training');
      row.findStatus().click();

      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.selectTab('Progress');
      trainingJobStatusModal.getModal().find('[role="tree"]').should('exist');
    });

    describe('Status-specific behavior', () => {
      // Create separate mocks for status-specific tests only
      const statusSpecificJobs = mockTrainJobK8sResourceList([
        {
          name: 'queued-training-job',
          namespace: projectName,
          status: TrainingJobState.QUEUED,
          numNodes: 2,
          localQueueName: 'queued-queue',
          creationTimestamp: '2024-01-19T10:00:00Z',
        },
        {
          name: 'pending-training-job',
          namespace: projectName,
          status: TrainingJobState.PENDING,
          numNodes: 2,
          localQueueName: 'pending-queue',
          creationTimestamp: '2024-01-19T11:00:00Z',
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
          name: 'preempted-training-job',
          namespace: projectName,
          status: TrainingJobState.PREEMPTED,
          numNodes: 2,
          localQueueName: 'preempted-queue',
          creationTimestamp: '2024-01-19T13:00:00Z',
        },
        {
          name: 'inadmissible-training-job',
          namespace: projectName,
          status: TrainingJobState.INADMISSIBLE,
          numNodes: 2,
          localQueueName: 'inadmissible-queue',
          creationTimestamp: '2024-01-19T14:00:00Z',
        },
        {
          name: 'deleting-training-job',
          namespace: projectName,
          status: TrainingJobState.DELETING,
          numNodes: 2,
          localQueueName: 'deleting-queue',
          creationTimestamp: '2024-01-19T15:00:00Z',
        },
      ]);

      const statusSpecificQueues = [
        {
          ...mockLocalQueueK8sResource({
            name: 'queued-queue',
            namespace: projectName,
          }),
          spec: {
            clusterQueue: 'queued-cluster-queue',
          },
        },
        {
          ...mockLocalQueueK8sResource({
            name: 'pending-queue',
            namespace: projectName,
          }),
          spec: {
            clusterQueue: 'pending-cluster-queue',
          },
        },
        {
          ...mockLocalQueueK8sResource({
            name: 'paused-queue',
            namespace: projectName,
          }),
          spec: {
            clusterQueue: 'paused-cluster-queue',
          },
        },
        {
          ...mockLocalQueueK8sResource({
            name: 'preempted-queue',
            namespace: projectName,
          }),
          spec: {
            clusterQueue: 'preempted-cluster-queue',
          },
        },
        {
          ...mockLocalQueueK8sResource({
            name: 'inadmissible-queue',
            namespace: projectName,
          }),
          spec: {
            clusterQueue: 'inadmissible-cluster-queue',
          },
        },
        {
          ...mockLocalQueueK8sResource({
            name: 'deleting-queue',
            namespace: projectName,
          }),
          spec: {
            clusterQueue: 'deleting-cluster-queue',
          },
        },
      ];

      const statusSpecificStatusMap: Record<string, TrainingJobState> = {
        'queued-training-job': TrainingJobState.QUEUED,
        'pending-training-job': TrainingJobState.PENDING,
        'paused-training-job': TrainingJobState.PAUSED,
        'preempted-training-job': TrainingJobState.PREEMPTED,
        'inadmissible-training-job': TrainingJobState.INADMISSIBLE,
        'deleting-training-job': TrainingJobState.DELETING,
      };

      const statusSpecificWorkloads = statusSpecificJobs.map((job) => {
        const jobStatus = statusSpecificStatusMap[job.metadata.name] ?? TrainingJobState.RUNNING;
        let workloadStatus = WorkloadStatusType.Running;
        let workloadSpec = { active: true };

        if (jobStatus === TrainingJobState.QUEUED) {
          workloadStatus = WorkloadStatusType.Admitted;
        } else if (jobStatus === TrainingJobState.PENDING) {
          workloadStatus = WorkloadStatusType.Pending;
        } else if (jobStatus === TrainingJobState.PAUSED) {
          workloadStatus = WorkloadStatusType.Running;
          workloadSpec = { active: false };
        } else if (jobStatus === TrainingJobState.PREEMPTED) {
          workloadStatus = WorkloadStatusType.Evicted;
        } else if (jobStatus === TrainingJobState.INADMISSIBLE) {
          workloadStatus = WorkloadStatusType.Inadmissible;
        } else if (jobStatus === TrainingJobState.DELETING) {
          workloadStatus = WorkloadStatusType.Running;
        }

        const workload = mockWorkloadK8sResource({
          k8sName: `workload-${job.metadata.name}`,
          namespace: job.metadata.namespace,
          mockStatus: workloadStatus,
        });

        if (!workload.metadata) {
          throw new Error('Workload metadata is required');
        }

        // For Queued status, we need Admitted=True but QuotaReserved=False
        if (jobStatus === TrainingJobState.QUEUED && workload.status?.conditions) {
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
              message: 'Waiting for resources',
              reason: '',
              status: 'False',
              type: 'QuotaReserved',
            },
          ];
        }

        // For Pending status, we need QuotaReserved=True but PodsReady=False
        if (jobStatus === TrainingJobState.PENDING && workload.status?.conditions) {
          workload.status.conditions = [
            {
              lastTransitionTime: '2024-03-18T19:15:28Z',
              message: 'Quota reserved in ClusterQueue cluster-queue',
              reason: 'QuotaReserved',
              status: 'True',
              type: 'QuotaReserved',
            },
            {
              lastTransitionTime: '2024-03-18T19:15:28Z',
              message: 'The workload is admitted',
              reason: 'Admitted',
              status: 'True',
              type: 'Admitted',
            },
            {
              lastTransitionTime: '2024-03-18T19:15:28Z',
              message: 'Pods are not ready yet',
              reason: 'PodsNotReady',
              status: 'False',
              type: 'PodsReady',
            },
          ];
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

        // For Preempted status, add Preempted condition
        if (jobStatus === TrainingJobState.PREEMPTED && workload.status?.conditions) {
          workload.status.conditions = [
            ...workload.status.conditions,
            {
              lastTransitionTime: '2024-03-18T19:15:28Z',
              message: 'The workload was preempted',
              reason: 'Preempted',
              status: 'True',
              type: 'Preempted',
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
            ...(jobStatus === TrainingJobState.DELETING
              ? { deletionTimestamp: new Date().toISOString() }
              : {}),
          },
        };
      });

      beforeEach(() => {
        // First set up base intercepts
        initIntercepts();

        // Then add status-specific jobs, queues, and workloads
        const allJobs = [...mockTrainJobs, ...statusSpecificJobs];
        const allQueues = [...mockLocalQueues, ...statusSpecificQueues];
        const allWorkloads = [...mockWorkloads, ...statusSpecificWorkloads];

        // Override TrainJob list to include status-specific jobs
        cy.interceptK8sList(
          {
            model: TrainJobModel,
            ns: projectName,
          },
          mockK8sResourceList(allJobs),
        );

        // Override LocalQueue list to include status-specific queues
        cy.interceptK8sList(
          {
            model: LocalQueueModel,
            ns: projectName,
          },
          mockK8sResourceList(allQueues),
        );

        // Intercept individual status-specific queues
        statusSpecificQueues.forEach((queue) => {
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

        // Mock ClusterQueues for status-specific jobs (create with correct names)
        const statusSpecificClusterQueues = [
          mockClusterQueueK8sResource({ name: 'queued-cluster-queue' }),
          mockClusterQueueK8sResource({ name: 'pending-cluster-queue' }),
          mockClusterQueueK8sResource({ name: 'paused-cluster-queue' }),
          mockClusterQueueK8sResource({ name: 'preempted-cluster-queue' }),
          mockClusterQueueK8sResource({ name: 'inadmissible-cluster-queue' }),
          mockClusterQueueK8sResource({ name: 'deleting-cluster-queue' }),
        ];

        statusSpecificClusterQueues.forEach((clusterQueue) => {
          if (clusterQueue.metadata?.name) {
            cy.interceptK8s(
              { model: ClusterQueueModel, name: clusterQueue.metadata.name },
              clusterQueue,
            );
          }
        });

        // Override Workload list to include status-specific workloads
        // This intercept handles requests without label selectors (general list)
        cy.interceptK8sList(
          {
            model: WorkloadModel,
            ns: projectName,
          },
          mockK8sResourceList(allWorkloads),
        );

        // Set up Workload list intercepts with label selectors for each job
        // This handles requests from getWorkloadForTrainJob which uses label selectors
        allJobs.forEach((job) => {
          const matchingWorkload = allWorkloads.find(
            (w) =>
              w.metadata.labels['kueue.x-k8s.io/job-uid'] === job.metadata.uid ||
              w.metadata.labels['kueue.x-k8s.io/job-name'] === job.metadata.name,
          );

          if (matchingWorkload && job.metadata.uid) {
            // Intercept for UID-based selector (most common)
            cy.interceptK8sList(
              {
                model: WorkloadModel,
                ns: projectName,
                queryParams: {
                  labelSelector: `kueue.x-k8s.io/job-uid=${job.metadata.uid}`,
                },
              },
              mockK8sResourceList([matchingWorkload]),
            );
          }

          if (matchingWorkload) {
            // Intercept for name-based selector (fallback)
            cy.interceptK8sList(
              {
                model: WorkloadModel,
                ns: projectName,
                queryParams: {
                  labelSelector: `kueue.x-k8s.io/job-name=${job.metadata.name}`,
                },
              },
              mockK8sResourceList([matchingWorkload]),
            );
          }
        });

        // Set up status modal intercepts for ALL jobs (both original and status-specific)
        allJobs.forEach((job) => {
          const matchingWorkload = allWorkloads.find(
            (w) =>
              w.metadata.labels['kueue.x-k8s.io/job-uid'] === job.metadata.uid ||
              w.metadata.labels['kueue.x-k8s.io/job-name'] === job.metadata.name,
          );
          initInterceptsForStatusModal(
            job.metadata.name,
            job.metadata.namespace || projectName,
            job.metadata.uid,
            matchingWorkload?.metadata.name,
            matchingWorkload?.metadata.uid,
          );
        });
      });

      it('should display correct status and buttons for Running job', () => {
        modelTrainingGlobal.visit(projectName);

        const row = trainingJobTable.getTableRow('image-classification-job');
        // Verify status in table column
        row.findStatus().should('contain', TrainingJobState.RUNNING);
        row.findStatus().click();

        trainingJobStatusModal.shouldBeOpen();
        trainingJobStatusModal.getTrainingJobStatus(TrainingJobState.RUNNING);
        // TODO: RHOAIENG-37578 - Retry and Pause/Resume button tests commented out
        // trainingJobStatusModal.findPauseResumeButton().should('be.visible');
        // trainingJobStatusModal.findPauseResumeButton().should('contain', 'Pause Job');
        // trainingJobStatusModal.findRetryButton().should('not.exist');
        trainingJobStatusModal.findDeleteButton().should('be.visible');
      });

      it('should display correct status and buttons for Failed job', () => {
        modelTrainingGlobal.visit(projectName);

        const row = trainingJobTable.getTableRow('failed-training-job');
        // Verify status in table column
        row.findStatus().should('contain', TrainingJobState.FAILED);
        row.findStatus().click();

        trainingJobStatusModal.shouldBeOpen();
        trainingJobStatusModal.getTrainingJobStatus(TrainingJobState.FAILED);
        // TODO: RHOAIENG-37578 - Retry and Pause/Resume button tests commented out
        // trainingJobStatusModal.findRetryButton().should('be.visible');
        // trainingJobStatusModal.findRetryButton().should('contain', 'Retry Job');
        // trainingJobStatusModal.findPauseResumeButton().should('not.exist');
        trainingJobStatusModal.findDeleteButton().should('be.visible');
      });

      it('should display correct status and buttons for Succeeded job', () => {
        modelTrainingGlobal.visit(projectName);

        const row = trainingJobTable.getTableRow('nlp-model-training');
        // Verify status in table column (UI displays "Complete" for SUCCEEDED)
        row.findStatus().should('contain', 'Complete');
        row.findStatus().click();

        trainingJobStatusModal.shouldBeOpen();
        // The UI displays "Complete" for SUCCEEDED status
        trainingJobStatusModal.getTrainingJobStatus('Complete');
        // TODO: RHOAIENG-37578 - Retry and Pause/Resume button tests commented out
        // trainingJobStatusModal.findPauseResumeButton().should('not.exist');
        // trainingJobStatusModal.findRetryButton().should('not.exist');
        trainingJobStatusModal.findDeleteButton().should('be.visible');
      });

      // Helper function to navigate to page containing the job if not on current page
      const navigateToJobPage = (jobName: string) => {
        trainingJobTable.findTable().then(($table) => {
          const jobExists =
            $table
              .find(`[data-label="Name"]`)
              .filter((_, el) => Cypress.$(el).text().trim() === jobName).length > 0;

          if (!jobExists) {
            // Check if next button is enabled before clicking
            tablePagination.top.findNextButton().then(($btn) => {
              if (!$btn.is(':disabled')) {
                tablePagination.top.findNextButton().click();
                // Wait for the job to appear on the new page
                trainingJobTable.getTableRow(jobName).find().should('be.visible');
              }
            });
          }
        });
      };

      it('should display correct status and buttons for Queued job', () => {
        modelTrainingGlobal.visit(projectName);

        // Navigate to page containing queued job if not on current page
        navigateToJobPage('queued-training-job');

        const row = trainingJobTable.getTableRow('queued-training-job');
        // Verify status in table column
        row.findStatus().should('contain', TrainingJobState.QUEUED);
        row.findStatus().click();

        trainingJobStatusModal.shouldBeOpen();
        trainingJobStatusModal.getTrainingJobStatus(TrainingJobState.QUEUED);
        // TODO: RHOAIENG-37578 - Retry and Pause/Resume button tests commented out
        // trainingJobStatusModal.findPauseResumeButton().should('be.visible');
        // trainingJobStatusModal.findPauseResumeButton().should('contain', 'Pause Job');
        // trainingJobStatusModal.findRetryButton().should('not.exist');
        trainingJobStatusModal.findDeleteButton().should('be.visible');
      });

      it('should display correct status and buttons for Pending job', () => {
        modelTrainingGlobal.visit(projectName);

        // Navigate to page containing pending job if not on current page
        navigateToJobPage('pending-training-job');

        const row = trainingJobTable.getTableRow('pending-training-job');
        // Verify status in table column
        row.findStatus().should('contain', TrainingJobState.PENDING);
        row.findStatus().click();

        trainingJobStatusModal.shouldBeOpen();
        trainingJobStatusModal.getTrainingJobStatus(TrainingJobState.PENDING);
        // TODO: RHOAIENG-37578 - Retry and Pause/Resume button tests commented out
        // trainingJobStatusModal.findPauseResumeButton().should('be.visible');
        // trainingJobStatusModal.findPauseResumeButton().should('contain', 'Pause Job');
        // trainingJobStatusModal.findRetryButton().should('not.exist');
        trainingJobStatusModal.findDeleteButton().should('be.visible');
      });

      it('should display correct status and buttons for Paused job', () => {
        modelTrainingGlobal.visit(projectName);

        // Navigate to page containing paused job if not on current page
        navigateToJobPage('paused-training-job');

        const row = trainingJobTable.getTableRow('paused-training-job');
        // Verify status in table column
        row.findStatus().should('contain', TrainingJobState.PAUSED);
        row.findStatus().click();

        trainingJobStatusModal.shouldBeOpen();
        trainingJobStatusModal.getTrainingJobStatus(TrainingJobState.PAUSED);
        // TODO: RHOAIENG-37578 - Retry and Pause/Resume button tests commented out
        // trainingJobStatusModal.findPauseResumeButton().should('be.visible');
        // trainingJobStatusModal.findPauseResumeButton().should('contain', 'Resume Job');
        // trainingJobStatusModal.findRetryButton().should('not.exist');
        trainingJobStatusModal.findDeleteButton().should('be.visible');
      });

      it('should display correct status and buttons for Preempted job', () => {
        modelTrainingGlobal.visit(projectName);

        // Navigate to page containing preempted job if not on current page
        navigateToJobPage('preempted-training-job');

        const row = trainingJobTable.getTableRow('preempted-training-job');
        // Verify status in table column
        row.findStatus().should('contain', TrainingJobState.PREEMPTED);
        row.findStatus().click();

        trainingJobStatusModal.shouldBeOpen();
        trainingJobStatusModal.getTrainingJobStatus(TrainingJobState.PREEMPTED);
        // TODO: RHOAIENG-37578 - Retry and Pause/Resume button tests commented out
        // trainingJobStatusModal.findPauseResumeButton().should('be.visible');
        // trainingJobStatusModal.findPauseResumeButton().should('contain', 'Pause Job');
        // trainingJobStatusModal.findRetryButton().should('not.exist');
        trainingJobStatusModal.findDeleteButton().should('be.visible');
      });

      it('should display correct status and buttons for Inadmissible job', () => {
        modelTrainingGlobal.visit(projectName);

        // Navigate to page containing inadmissible job if not on current page
        navigateToJobPage('inadmissible-training-job');

        const row = trainingJobTable.getTableRow('inadmissible-training-job');
        // Verify status in table column
        row.findStatus().should('contain', TrainingJobState.INADMISSIBLE);
        row.findStatus().click();

        trainingJobStatusModal.shouldBeOpen();
        trainingJobStatusModal.getTrainingJobStatus(TrainingJobState.INADMISSIBLE);
        // TODO: RHOAIENG-37578 - Retry and Pause/Resume button tests commented out
        // trainingJobStatusModal.findPauseResumeButton().should('not.exist');
        // trainingJobStatusModal.findRetryButton().should('not.exist');
        trainingJobStatusModal.findDeleteButton().should('be.visible');
      });
    });
  });

  describe('Node Scaling', () => {
    beforeEach(() => {
      initIntercepts();

      mockTrainJobs.forEach((job) => {
        const matchingWorkload = mockWorkloads.find(
          (w) =>
            w.metadata.labels['kueue.x-k8s.io/job-uid'] === job.metadata.uid ||
            w.metadata.labels['kueue.x-k8s.io/job-name'] === job.metadata.name,
        );

        if (matchingWorkload && job.metadata.uid) {
          cy.interceptK8sList(
            {
              model: WorkloadModel,
              ns: projectName,
              queryParams: {
                labelSelector: `kueue.x-k8s.io/job-uid=${job.metadata.uid}`,
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
                labelSelector: `kueue.x-k8s.io/job-name=${job.metadata.name}`,
              },
            },
            mockK8sResourceList([matchingWorkload]),
          );
        }
      });
    });

    it('should not show scale nodes option in kebab menu for running job', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Edit node count').should('not.exist');
    });

    it('should open scale nodes modal from inline edit button in Resources tab for paused job', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('paused-training-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      // Verify edit button is enabled for paused job
      trainingJobResourcesTab.findNodesEditButton().should('not.be.disabled');
      trainingJobResourcesTab.findNodesEditButton().click();

      scaleNodesModal.shouldBeOpen();
      scaleNodesModal.findNodeCountInput().should('have.value', '2');
    });

    it('should disable scaling for running, completed and failed jobs', () => {
      modelTrainingGlobal.visit(projectName);

      // Test running job
      const runningRow = trainingJobTable.getTableRow('image-classification-job');
      runningRow.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      // Verify edit button is disabled for running job
      trainingJobResourcesTab.findNodesEditButton().should('be.disabled');

      // Verify kebab menu option doesn't exist for running job
      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Edit node count').should('not.exist');

      trainingJobDetailsDrawer.close();

      // Test completed job
      const completedRow = trainingJobTable.getTableRow('nlp-model-training');
      completedRow.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      // Verify edit button is disabled for completed job
      trainingJobResourcesTab.findNodesEditButton().should('be.disabled');

      // Verify kebab menu option doesn't exist for completed job
      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Edit node count').should('not.exist');

      trainingJobDetailsDrawer.close();

      // Test failed job
      const failedRow = trainingJobTable.getTableRow('failed-training-job');
      failedRow.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Resources');

      // Verify edit button is disabled for failed job
      trainingJobResourcesTab.findNodesEditButton().should('be.disabled');

      // Verify kebab menu option doesn't exist for failed job
      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Edit node count').should('not.exist');
    });

    it('should successfully scale nodes up and down for paused job', () => {
      modelTrainingGlobal.visit(projectName);

      // Test scaling up from 2 to 4
      const pausedJobScaledUp = mockTrainJobK8sResourceList([
        {
          name: 'paused-training-job',
          namespace: projectName,
          status: TrainingJobState.PAUSED,
          numNodes: 4,
          localQueueName: 'paused-queue',
          suspend: true,
        },
      ])[0];

      cy.interceptK8s(
        'PATCH',
        {
          model: TrainJobModel,
          ns: projectName,
          name: 'paused-training-job',
        },
        pausedJobScaledUp,
      ).as('scaleNodesUp');

      const row = trainingJobTable.getTableRow('paused-training-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Edit node count').click();

      scaleNodesModal.shouldBeOpen();
      scaleNodesModal.findNodeCountInput().should('have.value', '2');

      // Scale up: change node count from 2 to 4
      scaleNodesModal.findNodeCountInput().type('{selectall}4');
      scaleNodesModal.findSaveButton().should('not.be.disabled');

      scaleNodesModal.save();

      // Verify the PATCH request for scaling up
      cy.wait('@scaleNodesUp').then((interception) => {
        expect(interception.request.body).to.deep.equal([
          {
            op: 'replace',
            path: '/spec/trainer/numNodes',
            value: 4,
          },
        ]);
      });

      scaleNodesModal.shouldBeOpen(false);

      // Test scaling down from 2 to 1
      const pausedJobScaledDown = mockTrainJobK8sResourceList([
        {
          name: 'paused-training-job',
          namespace: projectName,
          status: TrainingJobState.PAUSED,
          numNodes: 1,
          localQueueName: 'paused-queue',
          suspend: true,
        },
      ])[0];

      cy.interceptK8s(
        'PATCH',
        {
          model: TrainJobModel,
          ns: projectName,
          name: 'paused-training-job',
        },
        pausedJobScaledDown,
      ).as('scaleNodesDown');

      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Edit node count').click();

      scaleNodesModal.shouldBeOpen();

      // Scale down: change node count from 2 to 1
      scaleNodesModal.findNodeCountInput().type('{selectall}1');
      scaleNodesModal.findSaveButton().should('not.be.disabled');
      scaleNodesModal.save();

      // Verify the PATCH request for scaling down
      cy.wait('@scaleNodesDown').then((interception) => {
        expect(interception.request.body).to.deep.equal([
          {
            op: 'replace',
            path: '/spec/trainer/numNodes',
            value: 1,
          },
        ]);
      });

      scaleNodesModal.shouldBeOpen(false);
    });

    it('should reset modal state when reopened for paused job', () => {
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('paused-training-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();

      // Open modal first time
      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Edit node count').click();
      scaleNodesModal.shouldBeOpen();
      scaleNodesModal.setNodeCount(8);
      scaleNodesModal.cancel();
      scaleNodesModal.shouldBeOpen(false);

      // Open modal second time - should show original value
      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Edit node count').click();
      scaleNodesModal.shouldBeOpen();
      scaleNodesModal.findNodeCountInput().should('have.value', '2');
    });
  });
});
