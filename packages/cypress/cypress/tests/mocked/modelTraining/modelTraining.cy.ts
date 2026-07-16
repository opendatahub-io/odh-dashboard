/* eslint-disable camelcase */
import { mockTrainJobK8sResourceList } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import { TrainingJobState } from '@odh-dashboard/model-training/types';
import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { LocalQueueModel, RayJobModel, TrainJobModel } from '@odh-dashboard/internal/api/models';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { projectName, projectDisplayName, initIntercepts } from './modelTrainingMocks';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import {
  modelTrainingGlobal,
  trainingJobTable,
  trainingJobDetailsDrawer,
  trainingJobDetailsTab,
} from '../../../pages/modelTraining';
import { ProjectModel } from '../../../utils/models';

describe('Model Training Feature Availability', () => {
  beforeEach(() => {
    asClusterAdminUser();
  });

  it('Does not exist if Training Operator is not installed', () => {
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.TRAINER]: { managementState: 'Removed' },
        },
      }),
    );
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
        }),
      ]),
    );

    modelTrainingGlobal.visit(projectName, false);
    modelTrainingGlobal.findNavItem().should('not.exist');
    modelTrainingGlobal.shouldNotFoundPage();
  });

  it('Does not exist if feature flag is disabled', () => {
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.TRAINER]: { managementState: 'Managed' },
        },
      }),
    );
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        trainingJobs: false,
      }),
    );
    cy.interceptK8sList(
      ProjectModel,
      mockK8sResourceList([
        mockProjectK8sResource({
          k8sName: projectName,
          displayName: projectDisplayName,
        }),
      ]),
    );

    modelTrainingGlobal.visit(projectName, false);
    modelTrainingGlobal.findNavItem().should('not.exist');
    modelTrainingGlobal.shouldNotFoundPage();
  });

  it('Exists if only Trainer is installed and feature flag is enabled', () => {
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.TRAINER]: { managementState: 'Managed' },
          [DataScienceStackComponent.RAY]: { managementState: 'Removed' },
        },
      }),
    );
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
      mockK8sResourceList([]),
    );
    cy.interceptK8sList(
      {
        model: LocalQueueModel,
        ns: projectName,
      },
      mockK8sResourceList([]),
    );

    modelTrainingGlobal.visit(projectName);
    modelTrainingGlobal.findNavItem().should('exist');
  });

  it('Exists if only Ray is installed and feature flag is enabled', () => {
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.RAY]: { managementState: 'Managed' },
          [DataScienceStackComponent.TRAINER]: { managementState: 'Removed' },
        },
      }),
    );
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
        model: RayJobModel,
        ns: projectName,
      },
      mockK8sResourceList([]),
    );
    cy.interceptK8sList(
      {
        model: LocalQueueModel,
        ns: projectName,
      },
      mockK8sResourceList([]),
    );

    modelTrainingGlobal.visit(projectName);
    modelTrainingGlobal.findNavItem().should('exist');
  });

  it('Does not exist if neither Trainer nor Ray is installed', () => {
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.TRAINER]: { managementState: 'Removed' },
          [DataScienceStackComponent.RAY]: { managementState: 'Removed' },
        },
      }),
    );
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
        }),
      ]),
    );

    modelTrainingGlobal.visit(projectName, false);
    modelTrainingGlobal.findNavItem().should('not.exist');
    modelTrainingGlobal.shouldNotFoundPage();
  });
});

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
    imageClassificationRow.findType().should('contain', 'TrainJob');
    imageClassificationRow.findRayCluster().should('contain', '-');
    imageClassificationRow.findStatus().should('contain', TrainingJobState.RUNNING);
  });

  it('should show empty state when no jobs exist', () => {
    initIntercepts({ isEmpty: true });
    modelTrainingGlobal.visit(projectName);

    modelTrainingGlobal.findEmptyState().should('contain', 'No jobs');
    modelTrainingGlobal
      .findEmptyStateDescription()
      .should('contain', 'No TrainJobs or RayJobs have been found in this project.');
  });

  it('should display RayJobs alongside TrainJobs in the table', () => {
    initIntercepts();
    modelTrainingGlobal.visit(projectName);

    trainingJobTable.findTable().should('be.visible');

    const trainJobRow = trainingJobTable.getTableRow('image-classification-job');
    trainJobRow.findTrainingJobName().should('contain', 'image-classification-job');

    const rayJobRow = trainingJobTable.getTableRow('ray-data-processing');
    rayJobRow.findTrainingJobName().should('contain', 'ray-data-processing');
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

      trainingJobDetailsDrawer.findTab('Details').should('exist');
      trainingJobDetailsDrawer.findTab('Resources').should('exist');
      trainingJobDetailsDrawer.findTab('Pods').should('exist');
      trainingJobDetailsDrawer.findTab('Logs').should('exist');

      trainingJobDetailsDrawer.selectTab('Details');
      trainingJobDetailsDrawer.findActiveTabContent().should('contain', 'Job progress');

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

      trainingJobDetailsDrawer.findKebabMenuItem('Delete job').should('exist');
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

    it('should display progress bar for running job with progress percentage', () => {
      initIntercepts();
      modelTrainingGlobal.visit(projectName);

      const row = trainingJobTable.getTableRow('image-classification-job');
      row.findStatusProgressBar().should('exist');
      row.findStatusProgressBar().should('contain', '64%');
    });
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
});
