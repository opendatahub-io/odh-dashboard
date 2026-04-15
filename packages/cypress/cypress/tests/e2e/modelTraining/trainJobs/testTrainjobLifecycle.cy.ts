import yaml from 'js-yaml';
import { TrainingJobState } from '@odh-dashboard/model-training/types';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import { deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import { createCleanProject } from '../../../../utils/projectChecker';
import {
  deleteTrainingRuntime,
  setupTrainingResources,
  verifyTrainJobDeleted,
  verifyTrainJobPodsCompleted,
} from '../../../../utils/oc_commands/trainingJobs';
import { deleteKueueResources } from '../../../../utils/oc_commands/distributedWorkloads';
import {
  modelTrainingGlobal,
  trainingJobTable,
  trainingJobStatusModal,
} from '../../../../pages/modelTraining';
import { retryableBefore, wasSetupPerformed } from '../../../../utils/retryableHooks';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { deleteModal } from '../../../../pages/components/DeleteModal';
import { isTrainerManaged } from '../../../../utils/oc_commands/dsc';
import type { TrainJobTestData } from '../../../../types';

describe('Verify user can monitor a training job through its lifecycle', () => {
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
    cy.step('Check if Trainer component is Managed in DSC');
    isTrainerManaged().then((managed) => {
      if (!managed) {
        cy.log('Trainer component is not Managed in DSC, skipping the test.');
        skipTest = true;
      }
    });

    cy.then(() => {
      if (skipTest) {
        return;
      }

      cy.fixture('e2e/modelTraining/trainJobs/testTrainjobLifecycle.yaml', 'utf8')
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
    if (!wasSetupPerformed() || skipTest) {
      cy.log('Skipping cleanup: Setup was not performed or tests were skipped');
      return;
    }

    cy.step('Delete project');
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });

    cy.step('Delete TrainingRuntime');
    deleteTrainingRuntime(trainingRuntimeName, projectName, { ignoreNotFound: true });

    cy.step('Delete Kueue resources');
    deleteKueueResources(localQueueName, clusterQueueName, flavorName, projectName, {
      ignoreNotFound: true,
    });
  });

  it(
    'Should monitor training job from Running to Complete and verify backend pods',
    {
      tags: ['@Smoke', '@SmokeSet1', '@ModelTraining'],
    },
    function monitorLifecycle() {
      if (skipTest) {
        this.skip();
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

      cy.step('Wait for training job to reach Running status');
      trainingJobTable
        .getTableRow(trainJobName)
        .findStatus()
        .contains(TrainingJobState.RUNNING, { timeout: 120000 })
        .should('be.visible');

      cy.step('Click on the training job status to open status modal');
      trainingJobTable.getTableRow(trainJobName).findStatus().click();

      cy.step('Verify status modal opens and shows Running status');
      trainingJobStatusModal.shouldBeOpen();
      trainingJobStatusModal.findTitle().should('exist');
      trainingJobStatusModal.getTrainingJobStatus(TrainingJobState.RUNNING);

      cy.step('Switch to Events log tab and verify log entries exist');
      trainingJobStatusModal.selectTab('Events log');
      trainingJobStatusModal.findEventLogs().should('be.visible');
      trainingJobStatusModal.findEventLogEntries().should('have.length.greaterThan', 0);

      cy.step('Close modal and wait for training job to complete');
      trainingJobStatusModal.close();

      trainingJobTable
        .getTableRow(trainJobName)
        .findStatus()
        .contains(TrainingJobState.COMPLETE, { timeout: 180000 })
        .should('be.visible');

      cy.step('Verify backend pods have completed successfully');
      verifyTrainJobPodsCompleted(trainJobName, projectName);

      cy.step('Click on the training job status to open modal for deletion');
      trainingJobTable.getTableRow(trainJobName).findStatus().click();
      trainingJobStatusModal.shouldBeOpen();

      cy.step('Delete training job via delete button');
      trainingJobStatusModal.findDeleteButton().should('be.visible').click();

      cy.step('Confirm deletion in modal');
      deleteModal.shouldBeOpen();
      deleteModal.findInput().type(trainJobName);
      deleteModal.findSubmitButton().should('be.enabled').click();

      cy.step('Verify training job is deleted from UI');
      trainingJobStatusModal.shouldBeOpen(false);
      trainingJobTable.findEmptyState().should('be.visible');

      cy.step('Verify training job is deleted from the cluster');
      verifyTrainJobDeleted(trainJobName, projectName);
    },
  );
});
