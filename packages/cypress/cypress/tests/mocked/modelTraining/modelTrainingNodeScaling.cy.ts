/* eslint-disable camelcase */
import { mockTrainJobK8sResourceList } from '@odh-dashboard/model-training/__mocks__/mockTrainJobK8sResource';
import { TrainingJobState } from '@odh-dashboard/model-training/types';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { TrainJobModel, WorkloadModel } from '@odh-dashboard/internal/api/models';
import {
  projectName,
  mockTrainJobs,
  mockWorkloads,
  initIntercepts,
} from './modelTrainingTestUtils';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import {
  modelTrainingGlobal,
  trainingJobTable,
  trainingJobDetailsDrawer,
  trainingJobResourcesTab,
  scaleNodesModal,
} from '../../../pages/modelTraining';

// RHOAIENG-88673: TrainJob node scaling is disabled for RHOAI 3.6.
//
// Kubeflow Trainer 2.2 made `spec.trainer` immutable (kubeflow/trainer#3157), so PATCHing
// `spec.trainer.numNodes` after create is rejected by the TrainJob validating webhook, and
// upstream has not shipped a replacement API. The scale UI is disabled in TrainJobTableRow,
// TrainingJobDetailsDrawer and TrainingJobResourcesTab, so these tests cannot pass.
// Remove the `.skip` together with that UI once upstream supports post-create node scaling.
describe.skip('Model Training', () => {
  beforeEach(() => {
    asClusterAdminUser();
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
