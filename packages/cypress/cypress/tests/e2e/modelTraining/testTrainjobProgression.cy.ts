import yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { createCleanProject } from '../../../utils/projectChecker';
import {
  deleteTrainingRuntime,
  setupTrainingResources,
  verifyTrainJobDeleted,
} from '../../../utils/oc_commands/trainingJobs';
import { deleteKueueResources } from '../../../utils/oc_commands/distributedWorkloads';
import {
  modelTrainingGlobal,
  trainingJobTable,
  trainingJobStatusModal,
} from '../../../pages/modelTraining';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { deleteModal } from '../../../pages/components/DeleteModal';
import { getCustomResource } from '../../../utils/oc_commands/customResources';
import type { TrainJobTestData } from '../../../types';

describe('[Product Bug: RHOAIENG-45527] Verify a Training Job with Progression Tracking', () => {
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

      // Load test data from fixture
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

    cy.step('delete project');
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });

    cy.step('delete TrainingRuntime');
    deleteTrainingRuntime(trainingRuntimeName, projectName, { ignoreNotFound: true });

    cy.step('delete Kueue resources');
    deleteKueueResources(localQueueName, clusterQueueName, flavorName, projectName, {
      wait: false,
      ignoreNotFound: true,
    });
  });

  it(
    'Should create and complete training job with progression tracking',
    {
      tags: ['@Smoke', '@SmokeSet1', '@ModelTraining', '@Bug'],
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

      //enhance this once https://issues.redhat.com/browse/RHOAIENG-37271 is implemented
      cy.step('Click on the training job status');
      trainingJobTable.getTableRow(trainJobName).findStatus().click();

      cy.step('Verify status modal opens');
      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.findTitle().should('exist');

      cy.step('Verify status shows in modal');
      trainingJobStatusModal.findStatusLabel().should('exist');

      cy.step('Close modal and wait for training job to complete in table');
      trainingJobStatusModal.close();

      cy.step('Wait for training job to complete');
      trainingJobTable
        .getTableRow(trainJobName)
        .findStatus()
        .contains('Complete', { timeout: 180000 })
        .should('be.visible');

      cy.step('Click on the training job to open modal for deletion');
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
