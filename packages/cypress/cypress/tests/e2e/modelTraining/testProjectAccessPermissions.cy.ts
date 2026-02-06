import yaml from 'js-yaml';
import { TrainingJobState } from '@odh-dashboard/model-training/types';
import { HTPASSWD_CLUSTER_ADMIN_USER, LDAP_CONTRIBUTOR_USER } from '../../../utils/e2eUsers';
import { addUserToProject, deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { createCleanProject } from '../../../utils/projectChecker';
import {
  createTrainJob,
  createTrainingKueueResources,
  createTrainingRuntime,
  deleteTrainingRuntime,
} from '../../../utils/oc_commands/trainingJobs';
import { deleteKueueResources } from '../../../utils/oc_commands/distributedWorkloads';
import { modelTrainingGlobal, trainingJobTable } from '../../../pages/modelTraining';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { getCustomResource } from '../../../utils/oc_commands/customResources';
import type { TrainJobTestData } from '../../../types';

describe('Verify project access for user types in Training Jobs', () => {
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

  const shouldSkip = () => {
    if (skipTest) {
      cy.log('Skipping test - Trainer is RHOAI-specific and not available on ODH.');
      return true;
    }
    return false;
  };

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
          cy.step('Setup Kueue resources (ResourceFlavor, ClusterQueue, LocalQueue)');
          createTrainingKueueResources(
            flavorName,
            clusterQueueName,
            localQueueName,
            projectName,
            cpuQuota,
            memoryQuota,
            gpuQuota,
          );
        })
        .then(() => {
          cy.step('Setup TrainingRuntime');
          createTrainingRuntime(projectName, trainingRuntimeName);
        })
        .then(() => {
          cy.step('Create TrainJob');
          createTrainJob(projectName, trainJobName, trainingRuntimeName, localQueueName);
        });
    });
  });

  after(() => {
    if (shouldSkip()) {
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
    'Admin can access project and view training job',
    { tags: ['@Sanity', '@SanitySet1', '@ModelTraining'] },
    () => {
      if (shouldSkip()) {
        return;
      }

      cy.step('Log into the application as admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Training jobs');
      modelTrainingGlobal.navigate();

      cy.step('Verify admin can access the project and select it');
      modelTrainingGlobal.selectProject(projectName);

      cy.step('Verify admin can view the training job');
      trainingJobTable.findTable().should('be.visible');
      trainingJobTable.getTableRow(trainJobName).findTrainingJobName().should('exist');
    },
  );

  it(
    'Regular user cannot access project without permissions',
    { tags: ['@Sanity', '@SanitySet1', '@ModelTraining'] },
    () => {
      if (shouldSkip()) {
        return;
      }

      cy.step('Log in as regular user');
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      cy.step('Navigate to Training jobs');
      modelTrainingGlobal.navigate();

      cy.step('Verify regular user cannot access the project in the project selector');
      modelTrainingGlobal.findProjectSelectorToggle().click();
      modelTrainingGlobal.findProjectMenuItem(projectName).should('not.exist');
    },
  );

  it(
    'Regular user can access project after admin grants permission',
    { tags: ['@Sanity', '@SanitySet1', '@ModelTraining'] },
    () => {
      if (shouldSkip()) {
        return;
      }

      cy.step('Grant edit role to regular user via oc command');
      addUserToProject(projectName, LDAP_CONTRIBUTOR_USER.USERNAME, 'edit');

      cy.step('Log in as regular user');
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      cy.step('Navigate to Training jobs');
      modelTrainingGlobal.navigate();

      cy.step('Verify regular user can now access the project and select it');
      modelTrainingGlobal.selectProject(projectName);

      cy.step('Verify regular user can now view the training job');
      trainingJobTable.findTable().should('be.visible');
      trainingJobTable.getTableRow(trainJobName).findTrainingJobName().should('exist');

      cy.step('Verify training job is running with progress bar');
      trainingJobTable
        .getTableRow(trainJobName)
        .findStatus()
        .contains(TrainingJobState.RUNNING, { timeout: 120000 })
        .should('be.visible');
      trainingJobTable.getTableRow(trainJobName).findStatusProgressBar().should('be.visible');
    },
  );
});
