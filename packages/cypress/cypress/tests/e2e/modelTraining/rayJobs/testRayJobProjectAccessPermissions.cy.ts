import yaml from 'js-yaml';
import { RayJobState } from '@odh-dashboard/model-training/types';
import { HTPASSWD_CLUSTER_ADMIN_USER, LDAP_CONTRIBUTOR_USER } from '../../../../utils/e2eUsers';
import { addUserToProject, deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import { createCleanProject } from '../../../../utils/projectChecker';
import { createTrainingKueueResources } from '../../../../utils/oc_commands/trainingJobs';
import { createBasicRayJob, deleteRayJob } from '../../../../utils/oc_commands/rayJobs';
import { deleteKueueResources } from '../../../../utils/oc_commands/distributedWorkloads';
import { ensureAdminOcSession } from '../../../../utils/oc_commands/baseCommands';
import { modelTrainingGlobal, trainingJobTable } from '../../../../pages/modelTraining';
import { retryableBefore, wasSetupPerformed } from '../../../../utils/retryableHooks';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { isTrainerManaged } from '../../../../utils/oc_commands/dsc';
import type { RayJobTestData } from '../../../../types';

describe('Verify project access for user types in Ray Jobs', () => {
  let testData: RayJobTestData;
  let skipTest = false;
  let projectName: string;
  let rayJobName: string;
  let rayImage: string;
  let flavorName: string;
  let clusterQueueName: string;
  let localQueueName: string;
  let cpuQuota: number;
  let memoryQuota: number;
  let gpuQuota: number;
  const uuid = generateTestUUID();

  const shouldSkip = () => {
    if (skipTest) {
      cy.log('Skipping test - Ray jobs require RHOAI and are not available on ODH.');
      return true;
    }
    return false;
  };

  retryableBefore(() => {
    cy.step('Ensure admin oc session for setup');
    ensureAdminOcSession();

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

      cy.fixture('e2e/modelTraining/rayJobs/testRayJobProjectAccess.yaml', 'utf8')
        .then((yamlContent: string) => {
          testData = yaml.load(yamlContent) as RayJobTestData;

          projectName = `${testData.projectName}-${uuid}`;
          rayJobName = `${testData.rayJobName}-${uuid}`;
          rayImage = testData.rayImage;
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
          cy.step('Create RayJob');
          createBasicRayJob(projectName, rayJobName, rayImage, localQueueName);
        });
    });
  });

  after(() => {
    if (!wasSetupPerformed() || shouldSkip()) {
      cy.log('Skipping cleanup: Setup was not performed or tests were skipped');
      return;
    }

    cy.step('Restore admin oc session for cleanup');
    ensureAdminOcSession();

    cy.step('Delete RayJob');
    deleteRayJob(rayJobName, projectName, { ignoreNotFound: true });

    cy.step('Delete Kueue resources');
    deleteKueueResources(localQueueName, clusterQueueName, flavorName, projectName, {
      ignoreNotFound: true,
    });

    cy.step('Delete project');
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Admin can access project and view Ray job',
    { tags: ['@Sanity', '@SanitySet1', '@ModelTraining', '@RayJob'] },
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

      cy.step('Verify admin can view the Ray job');
      trainingJobTable.findTable().should('be.visible');
      trainingJobTable.getTableRow(rayJobName).findTrainingJobName().should('exist');
    },
  );

  it(
    'Regular user access transitions from denied to granted',
    { tags: ['@Sanity', '@SanitySet1', '@ModelTraining', '@RayJob'] },
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
      modelTrainingGlobal.findProjectSelectorToggle().click();

      cy.step('Grant edit role to regular user via oc command');
      addUserToProject(projectName, LDAP_CONTRIBUTOR_USER.USERNAME, 'edit');

      cy.step('Re-login as regular user to pick up new permissions');
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      cy.step('Navigate to Training jobs');
      modelTrainingGlobal.navigate();

      cy.step('Verify regular user can now access the project and select it');
      modelTrainingGlobal.selectProject(projectName);

      cy.step('Verify regular user can now view the Ray job');
      trainingJobTable.findTable().should('be.visible');
      trainingJobTable.getTableRow(rayJobName).findTrainingJobName().should('exist');

      cy.step('Verify Ray job is running');
      trainingJobTable
        .getTableRow(rayJobName)
        .findStatus()
        .contains(RayJobState.RUNNING, { timeout: 120000 })
        .should('be.visible');
    },
  );
});
