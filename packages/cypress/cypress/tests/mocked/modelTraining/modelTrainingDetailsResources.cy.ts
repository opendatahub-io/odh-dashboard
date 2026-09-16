/* eslint-disable camelcase */
import { mockTrainJobK8sResourceList } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import { TrainingJobState } from '@odh-dashboard/model-training/types';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockClusterQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockClusterQueueK8sResource';
import { ClusterQueueModel } from '@odh-dashboard/k8s-core/api/models';
import { TrainJobModel } from '@odh-dashboard/internal/api/models';
import { projectName, initIntercepts } from './modelTrainingTestUtils';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import {
  modelTrainingGlobal,
  trainingJobTable,
  trainingJobDetailsDrawer,
  trainingJobResourcesTab,
  trainingJobDetailsTab,
} from '../../../pages/modelTraining';

describe('Model Training', () => {
  beforeEach(() => {
    asClusterAdminUser();
  });

  describe('Training Details Tab', () => {
    it('should display all sections in Training details tab', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Details');

      // Verify all sections are present
      trainingJobDetailsTab.findProgressSection().should('exist');
      trainingJobDetailsTab.findMetricsSection().should('exist');
    });

    it('should display progress information', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Details');

      // Check progress section
      trainingJobDetailsTab.findProgressSection().should('contain', 'Job progress');
      trainingJobDetailsTab.findEstimatedTimeRemainingValue().should('contain', '30 minutes');
      trainingJobDetailsTab.findStepsValue().should('contain', '3000 / 4690');
      trainingJobDetailsTab.findEpochsValue().should('contain', '3 / 5');
    });

    it('should display metrics information', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('nlp-model-training');
      row.findNameLink().click();

      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Details');

      // Check metrics section
      trainingJobDetailsTab.findMetricsSection().should('contain', 'Metrics');
      trainingJobDetailsTab.findLossValue().should('contain', '0.2344');
      trainingJobDetailsTab.findAccuracyValue().should('contain', '0.8993774');
      trainingJobDetailsTab.findTotalBatchesValue().should('contain', '854');
      trainingJobDetailsTab.findTotalSamplesValue().should('contain', '4000');
    });

    it('should update Training details tab when switching between jobs', () => {
      initIntercepts();

      // Create jobs with different trainerStatus values
      const jobsWithDifferentStatus = mockTrainJobK8sResourceList([
        {
          name: 'early-job',
          namespace: projectName,
          status: TrainingJobState.RUNNING,
          numNodes: 2,
          localQueueName: 'default-queue',
          creationTimestamp: '2024-01-15T10:30:00Z',
          trainerStatus: {
            estimatedRemainingSeconds: 3600,
            currentStep: 100,
            totalSteps: 1000,
            currentEpoch: 1,
            totalEpochs: 10,
            trainMetrics: {
              loss: 0.9,
              accuracy: 0.5,
              // eslint-disable-next-line @typescript-eslint/naming-convention
              total_batches: 50,
              // eslint-disable-next-line @typescript-eslint/naming-convention
              total_samples: 500,
            },
            lastUpdatedTime: '2024-01-15T10:45:00Z',
          },
        },
        {
          name: 'late-job',
          namespace: projectName,
          status: TrainingJobState.RUNNING,
          numNodes: 3,
          localQueueName: 'default-queue',
          creationTimestamp: '2024-01-14T08:15:00Z',
          trainerStatus: {
            estimatedRemainingSeconds: 600,
            currentStep: 9000,
            totalSteps: 10000,
            currentEpoch: 9,
            totalEpochs: 10,
            trainMetrics: {
              loss: 0.1,
              accuracy: 0.99,
              // eslint-disable-next-line @typescript-eslint/naming-convention
              total_batches: 5000,
              // eslint-disable-next-line @typescript-eslint/naming-convention
              total_samples: 50000,
            },
            lastUpdatedTime: '2024-01-15T10:45:00Z',
          },
        },
      ]);

      cy.interceptK8sList(
        {
          model: TrainJobModel,
          ns: projectName,
        },
        mockK8sResourceList(jobsWithDifferentStatus),
      );

      modelTrainingGlobal.visit(projectName);

      // Check first job
      const firstRow = trainingJobTable.getTableRow('early-job');
      firstRow.findNameLink().click();
      trainingJobDetailsDrawer.shouldBeOpen();
      trainingJobDetailsDrawer.selectTab('Details');

      trainingJobDetailsTab.findEstimatedTimeRemainingValue().should('contain', '1 hour');
      trainingJobDetailsTab.findStepsValue().should('contain', '100 / 1000');
      trainingJobDetailsTab.findEpochsValue().should('contain', '1 / 10');
      trainingJobDetailsTab.findLossValue().should('contain', '0.9');
      trainingJobDetailsTab.findAccuracyValue().should('contain', '0.5');

      // Switch to second job
      const secondRow = trainingJobTable.getTableRow('late-job');
      secondRow.findNameLink().click();

      trainingJobDetailsTab.findEstimatedTimeRemainingValue().should('contain', '10 minutes');
      trainingJobDetailsTab.findStepsValue().should('contain', '9000 / 10000');
      trainingJobDetailsTab.findEpochsValue().should('contain', '9 / 10');
      trainingJobDetailsTab.findLossValue().should('contain', '0.1');
      trainingJobDetailsTab.findAccuracyValue().should('contain', '0.99');
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
      // RHOAIENG-88673: node count is read-only while TrainJob scaling is disabled
      // trainingJobResourcesTab.findNodesEditButton().should('exist');
      // trainingJobResourcesTab.findNodesEditButton().should('be.disabled');
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

      trainingJobResourcesTab.findQuotaSourceValue().should('have.text', '-');
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

      trainingJobResourcesTab.findConsumedQuotaValue().should('have.text', '-');
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
