/* eslint-disable camelcase */
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { LocalQueueModel, RayJobModel, TrainJobModel } from '@odh-dashboard/internal/api/models';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { projectName, projectDisplayName, initIntercepts } from './modelTrainingTestUtils';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import {
  modelTrainingGlobal,
  trainingJobTable,
  trainingJobDetailsDrawer,
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

  // CONVERTED to Jest: TrainJobTableRow.spec.tsx, JobsTable.spec.tsx

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

    // CONVERTED: 'should display progress bar for running job with progress percentage' moved to:
    //   packages/model-training/src/global/trainingJobList/components/__tests__/TrainingJobStatus.spec.tsx
    //   packages/model-training/src/global/trainingJobList/__tests__/TrainJobTableRow.spec.tsx
  });
});
