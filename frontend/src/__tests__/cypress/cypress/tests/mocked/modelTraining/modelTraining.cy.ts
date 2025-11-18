/* eslint-disable camelcase */
import { mockTrainJobK8sResourceList } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import { TrainingJobState } from '@odh-dashboard/model-training/types';
import { asClusterAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { mockDashboardConfig, mockK8sResourceList, mockProjectK8sResource } from '#~/__mocks__';
import {
  modelTrainingGlobal,
  trainingJobTable,
  trainingJobDetailsDrawer,
  trainingJobResourcesTab,
} from '#~/__tests__/cypress/cypress/pages/modelTraining';
import { ProjectModel } from '#~/__tests__/cypress/cypress/utils/models';
import { ClusterQueueModel, LocalQueueModel, TrainJobModel } from '#~/api/models';
import { mockLocalQueueK8sResource } from '#~/__mocks__/mockLocalQueueK8sResource';
import { mockClusterQueueK8sResource } from '#~/__mocks__/mockClusterQueueK8sResource';
import { ContainerResourceAttributes } from '#~/types';

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
  },
  {
    name: 'nlp-model-training',
    namespace: projectName,
    status: TrainingJobState.SUCCEEDED,
    numNodes: 3,
    localQueueName: 'default-queue',
    creationTimestamp: '2024-01-14T08:15:00Z',
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
  }
};

describe('Model Training', () => {
  beforeEach(() => {
    asClusterAdminUser();
  });

  it('should display correct data in training job table rows', () => {
    initIntercepts();
    modelTrainingGlobal.visit(projectName);

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
      trainingJobDetailsDrawer.findActiveTabContent().should('contain', 'Pods content');

      trainingJobDetailsDrawer.selectTab('Logs');
      trainingJobDetailsDrawer.findActiveTabContent().should('contain', 'Logs content');
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
      trainingJobResourcesTab.findNodesEditButton().should('be.disabled');
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
});
