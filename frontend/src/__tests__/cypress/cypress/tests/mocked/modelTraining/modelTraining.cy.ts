/* eslint-disable camelcase */
import { asClusterAdminUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';
import {
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockPyTorchJobK8sResourceList,
} from '#~/__mocks__';
import {
  modelTrainingGlobal,
  trainingJobTable,
} from '#~/__tests__/cypress/cypress/pages/modelTraining';
import { ProjectModel } from '#~/__tests__/cypress/cypress/utils/models';
import { LocalQueueModel, PyTorchJobModel } from '#~/api/models';
import { mockLocalQueueK8sResource } from '#~/__mocks__/mockLocalQueueK8sResource';
import { PyTorchJobState } from '../../../../../../../packages/model-training/src/types';

const projectName = 'test-model-training-project';
const projectDisplayName = 'Test Model Training Project';

const mockPyTorchJobs = mockPyTorchJobK8sResourceList([
  {
    name: 'image-classification-job',

    namespace: projectName,
    status: PyTorchJobState.RUNNING,
    workerReplicas: 3,
    localQueueName: 'training-queue',
    creationTimestamp: '2024-01-15T10:30:00Z',
  },
  {
    name: 'nlp-model-training',

    namespace: projectName,
    status: PyTorchJobState.SUCCEEDED,
    workerReplicas: 2,
    localQueueName: 'default-queue',
    creationTimestamp: '2024-01-14T08:15:00Z',
  },
  {
    name: 'failed-training-job',

    namespace: projectName,
    status: PyTorchJobState.FAILED,
    workerReplicas: 1,
    localQueueName: 'urgent-queue',
    creationTimestamp: '2024-01-13T14:45:00Z',
  },
  {
    name: 'z-last-job',

    namespace: projectName,
    status: PyTorchJobState.SUCCEEDED,
    workerReplicas: 1,
    localQueueName: 'z-queue',
    creationTimestamp: '2024-01-16T10:30:00Z',
  },
  {
    name: 'a-first-job',
    namespace: projectName,
    status: PyTorchJobState.FAILED,
    workerReplicas: 5,
    localQueueName: 'a-queue',
    creationTimestamp: '2024-01-13T08:15:00Z',
  },
  {
    name: 'middle-job',
    namespace: projectName,
    status: PyTorchJobState.RUNNING,
    workerReplicas: 3,
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
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        trainingoperator: true,
        kueue: true,
      },
    }),
  );

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelTraining: false,
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
      model: PyTorchJobModel,
      ns: projectName,
    },
    mockK8sResourceList(isEmpty ? [] : mockPyTorchJobs),
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
    imageClassificationRow.findWorkerNodes().should('contain', '3');
    imageClassificationRow.findClusterQueue().should('contain', 'test-cluster-queue');
    imageClassificationRow.findStatus().should('contain', 'Running');
  });

  it('should show empty state when no training jobs exist', () => {
    initIntercepts({ isEmpty: true });
    modelTrainingGlobal.visit(projectName);

    // Verify empty state is displayed
    modelTrainingGlobal.findEmptyState().should('contain', 'No training jobs');
    modelTrainingGlobal
      .findEmptyStateDescription()
      .should('contain', 'No PyTorch training jobs have been found in this project');
  });
});
