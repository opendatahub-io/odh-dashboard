/* eslint-disable camelcase */
import { mockTrainJobK8sResourceList } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import { TrainingJobState } from '@odh-dashboard/model-training/types';
import { asClusterAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { mockDashboardConfig, mockK8sResourceList, mockProjectK8sResource } from '#~/__mocks__';
import {
  modelTrainingGlobal,
  trainingJobTable,
  trainingJobDetailsDrawer,
} from '#~/__tests__/cypress/cypress/pages/modelTraining';
import { ProjectModel } from '#~/__tests__/cypress/cypress/utils/models';
import { LocalQueueModel, TrainJobModel } from '#~/api/models';
import { mockLocalQueueK8sResource } from '#~/__mocks__/mockLocalQueueK8sResource';

const projectName = 'test-model-training-project';
const projectDisplayName = 'Test Model Training Project';

const mockTrainJobs = mockTrainJobK8sResourceList([
  {
    name: 'image-classification-job',
    namespace: projectName,
    status: TrainingJobState.RUNNING,
    numNodes: 4,
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
];

const initIntercepts = ({ isEmpty = false }: { isEmpty?: boolean } = {}) => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      modelTraining: true,
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

    // Verify empty state is displayed
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

      trainingJobDetailsDrawer.findTab('Training details').should('exist');
      trainingJobDetailsDrawer.findTab('Resources').should('exist');
      trainingJobDetailsDrawer.findTab('Pods').should('exist');
      trainingJobDetailsDrawer.findTab('Logs').should('exist');

      trainingJobDetailsDrawer.selectTab('Resources');
      trainingJobDetailsDrawer.findActiveTabContent().should('contain', 'Resources content');

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
});
