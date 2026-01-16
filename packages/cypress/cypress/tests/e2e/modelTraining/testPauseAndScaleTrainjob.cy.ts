import yaml from 'js-yaml';
import { TrainingJobState } from '@odh-dashboard/model-training/types';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { createCleanProject } from '../../../utils/projectChecker';
import {
  deleteTrainingRuntime,
  getTrainJobNumNodes,
  setupTrainingResources,
  verifyTrainJobDeleted,
} from '../../../utils/oc_commands/trainingJobs';
import { deleteKueueResources } from '../../../utils/oc_commands/distributedWorkloads';
import {
  modelTrainingGlobal,
  pauseTrainingJobModal,
  scaleNodesModal,
  trainingJobDetailsDrawer,
  trainingJobResourcesTab,
  trainingJobStatusModal,
  trainingJobTable,
} from '../../../pages/modelTraining';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { deleteModal } from '../../../pages/components/DeleteModal';
import { getCustomResource } from '../../../utils/oc_commands/customResources';
import type { TrainJobTestData } from '../../../types';

// Node count constants - initial is defined in train-job.yaml, updated is the target after scaling
const INITIAL_NODE_COUNT = 1;
const UPDATED_NODE_COUNT = 2;

describe('Verify Pause, Scale Node Count, and Resume Training Job', () => {
  let testData: TrainJobTestData;
  let skipTest = false;
  let projectName: string;
  let trainJobName: string;
  let trainingRuntimeName: string;
  let flavorName: string;
  let clusterQueueName: string;
  let localQueueName: string;
  let cpuQuota: number;
  let memoryQuota: number;
  let gpuQuota: number;
  const uuid = generateTestUUID();

  retryableBefore(() => {
    // Check if the operator is RHOAI, if it's not (ODH), skip the test
    cy.step('Check if the operator is RHOAI');
    getCustomResource('redhat-ods-operator', 'Deployment', 'name=rhods-operator').then((result) => {
      if (!result.stdout.includes('rhods-operator')) {
        cy.log('RHOAI operator not found, skipping the test (Trainer is RHOAI-specific).');
        skipTest = true;
      } else {
        cy.log('RHOAI operator confirmed:', result.stdout);
      }
    });

    // If not skipping, proceed with test setup
    cy.then(() => {
      if (skipTest) {
        return;
      }

      // Load test data from fixture (reusing existing fixture)
      cy.fixture('e2e/modelTraining/testTrainjobProgression.yaml', 'utf8')
        .then((yamlContent: string) => {
          testData = yaml.load(yamlContent) as TrainJobTestData;

          projectName = `${testData.projectName}-${uuid}`;
          trainJobName = `${testData.trainJobName}-${uuid}`;
          trainingRuntimeName = `${testData.trainingRuntimeName}-${uuid}`;
          flavorName = `${testData.flavorName}-${uuid}`;
          clusterQueueName = `${testData.clusterQueueName}-${uuid}`;
          localQueueName = `${testData.localQueueName}-${uuid}`;
          cpuQuota = testData.cpuQuota;
          memoryQuota = testData.memoryQuota;
          gpuQuota = testData.gpuQuota;

          cy.log(`Test configuration loaded for project: ${projectName}`);
        })
        .then(() => {
          cy.step('Create testing project');
          cy.log(`Creating project: ${projectName}`);
          createCleanProject(projectName);
        })
        .then(() => {
          cy.step('Setup training resources (Kueue, TrainingRuntime, TrainJob)');
          setupTrainingResources({
            namespace: projectName,
            trainJobName,
            trainingRuntimeName,
            flavorName,
            clusterQueueName,
            localQueueName,
            cpuQuota,
            memoryQuota,
            gpuQuota,
          });
        });
    });
  });

  after(() => {
    if (skipTest) {
      cy.log('Skipping cleanup: Tests were skipped');
      return;
    }

    cy.step('Delete project');
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });

    cy.step('Delete TrainingRuntime');
    deleteTrainingRuntime(trainingRuntimeName, projectName, { ignoreNotFound: true });

    cy.step('Delete Kueue resources');
    deleteKueueResources(localQueueName, clusterQueueName, flavorName, projectName, {
      wait: false,
      ignoreNotFound: true,
    });
  });

  it(
    'Should pause running job, update node count, resume, and complete training',
    {
      tags: ['@Sanity', '@SanitySet1', '@ModelTraining'],
    },
    () => {
      if (skipTest) {
        cy.log('Skipping test - Trainer component is RHOAI-specific and not available on ODH.');
        return;
      }

      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Training jobs');
      modelTrainingGlobal.navigate();

      cy.step('Select the project');
      modelTrainingGlobal.selectProject(projectName);

      cy.step('Verify training job appears in the table');
      trainingJobTable.findTable().should('be.visible');
      trainingJobTable.getTableRow(trainJobName).findTrainingJobName().should('exist');

      cy.step('Wait for training job to be Running');
      trainingJobTable
        .getTableRow(trainJobName)
        .findStatus()
        .contains(TrainingJobState.RUNNING, { timeout: 120000 })
        .should('be.visible');

      cy.step('Wait for training job to make some progress before pausing');
      trainingJobTable
        .getTableRow(trainJobName)
        .findStatusProgressBar()
        .should('be.visible')
        .contains('27%', { timeout: 60000 });

      cy.step('Click on the training job status to open modal');
      trainingJobTable.getTableRow(trainJobName).findStatus().click();

      cy.step('Verify status modal opens');
      trainingJobStatusModal.shouldBeOpen();

      cy.step('Click Pause button to pause the running job');
      trainingJobStatusModal.findPauseResumeButton().should('be.visible').click();

      cy.step('Confirm pause in the confirmation modal');
      pauseTrainingJobModal.shouldBeOpen();
      pauseTrainingJobModal.findPauseButton().should('be.visible').and('be.enabled').click();

      cy.step('Wait for confirmation modal to close');
      pauseTrainingJobModal.shouldBeOpen(false);

      cy.step('Wait for status modal to close (UI closes modal after pause action)');
      trainingJobStatusModal.shouldBeOpen(false);

      cy.step('Wait for job status to show Paused in the table');
      trainingJobTable
        .getTableRow(trainJobName)
        .findStatus()
        .contains(TrainingJobState.PAUSED, { timeout: 60000 })
        .should('be.visible');

      cy.step('Click on training job name to open details drawer');
      trainingJobTable.getTableRow(trainJobName).findNameLink().click();

      cy.step('Verify details drawer opens');
      trainingJobDetailsDrawer.shouldBeOpen();

      cy.step('Navigate to Resources tab');
      trainingJobDetailsDrawer.selectTab('Resources');

      cy.step('Verify initial node count in UI');
      trainingJobResourcesTab.findNodesValue().should('contain', INITIAL_NODE_COUNT.toString());

      cy.step('Click Edit node count via kebab menu');
      trainingJobDetailsDrawer.clickKebabMenu();
      trainingJobDetailsDrawer.findKebabMenuItem('Edit node count').click();

      cy.step('Verify scale nodes modal opens');
      scaleNodesModal.shouldBeOpen();
      scaleNodesModal.findNodeCountInput().should('have.value', INITIAL_NODE_COUNT.toString());

      cy.step(
        `Update node count from ${INITIAL_NODE_COUNT} to ${UPDATED_NODE_COUNT} using plus button`,
      );
      // Click plus button to increment from 1 to 2 (avoids input append issue)
      scaleNodesModal.findPlusButton().click();
      scaleNodesModal.findNodeCountInput().should('have.value', UPDATED_NODE_COUNT.toString());
      scaleNodesModal.findSaveButton().should('not.be.disabled');
      scaleNodesModal.save();

      cy.step('Verify scale nodes modal closes');
      scaleNodesModal.shouldBeOpen(false);

      cy.step('Verify updated node count in UI');
      trainingJobResourcesTab.findNodesValue().should('contain', UPDATED_NODE_COUNT.toString());

      cy.step('Verify backend TrainJob has updated numNodes');
      getTrainJobNumNodes(trainJobName, projectName).then((numNodes) => {
        expect(numNodes).to.equal(UPDATED_NODE_COUNT);
      });

      cy.step('Close the details drawer');
      trainingJobDetailsDrawer.close();

      cy.step('Click on training job status to open modal for resuming');
      trainingJobTable.getTableRow(trainJobName).findStatus().click();
      trainingJobStatusModal.shouldBeOpen();

      cy.step('Click Resume button to resume the paused job');
      trainingJobStatusModal.findPauseResumeButton().should('contain', 'Resume').click();

      cy.step('Wait for job status to show Running after resume');
      trainingJobStatusModal.getTrainingJobStatus(TrainingJobState.RUNNING, 60000);

      cy.step('Close the status modal');
      trainingJobStatusModal.close();

      cy.step('Wait for training job to complete');
      trainingJobTable
        .getTableRow(trainJobName)
        .findStatus()
        .contains(TrainingJobState.COMPLETE, { timeout: 180000 })
        .should('be.visible');

      cy.step('Click on the training job status to open modal for deletion');
      trainingJobTable.getTableRow(trainJobName).findStatus().click();
      trainingJobStatusModal.shouldBeOpen();

      cy.step('Delete training job via delete button');
      trainingJobStatusModal.findDeleteButton().should('be.visible').click();

      cy.step('Confirm deletion in modal');
      deleteModal.shouldBeOpen();
      deleteModal.findInput().type(trainJobName);
      deleteModal.findSubmitButton().should('be.enabled').click();

      cy.step('Verify training job is deleted');
      // Modal should close
      trainingJobStatusModal.shouldBeOpen(false);

      // Verify empty state is shown with correct message
      trainingJobTable.findEmptyState().should('be.visible');

      // Verify via oc command that resource is deleted
      verifyTrainJobDeleted(trainJobName, projectName);
    },
  );
});
