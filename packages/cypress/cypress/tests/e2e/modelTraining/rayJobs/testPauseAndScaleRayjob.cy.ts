import yaml from 'js-yaml';
import { RayJobState } from '@odh-dashboard/model-training/types';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import { deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import { createCleanProject } from '../../../../utils/projectChecker';
import { deleteKueueResources } from '../../../../utils/oc_commands/distributedWorkloads';
import {
  getRayJobWorkerReplicas,
  setupRayJobResources,
  verifyRayJobDeleted,
} from '../../../../utils/oc_commands/rayJobs';
import {
  editRayJobNodeCountModal,
  modelTrainingGlobal,
  pauseRayJobModal,
  rayJobDetailsDrawer,
  rayJobResourcesTab,
  rayJobStatusModal,
  trainingJobTable,
} from '../../../../pages/modelTraining';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { deleteModal } from '../../../../pages/components/DeleteModal';
import type { RayJobE2eTestData } from '../../../../types';

const INITIAL_WORKER_REPLICAS = 1;
const UPDATED_WORKER_REPLICAS = 2;
/** UI "Nodes" = 1 head + sum(worker replicas) — see getNodeCountFromClusterSpec. */
const INITIAL_TOTAL_NODES = INITIAL_WORKER_REPLICAS + 1;
const UPDATED_TOTAL_NODES = UPDATED_WORKER_REPLICAS + 1;

describe('Verify pause, scale worker nodes, and delete RayJob', () => {
  let testData: RayJobE2eTestData;
  let skipTest = false;
  let projectName: string;
  let rayJobName: string;
  let flavorName: string;
  let clusterQueueName: string;
  let localQueueName: string;
  let workerGroupName: string;
  let cpuQuota: number;
  let memoryQuota: number;
  let gpuQuota: number;
  let rayImage: string;
  let rayVersion: string;
  const uuid = generateTestUUID();

  retryableBefore(() => {
    cy.step('Check if RayJob CRD is available');
    cy.exec('oc get crd rayjobs.ray.io', { failOnNonZeroExit: false }).then((result) => {
      if (result.code !== 0) {
        cy.log('RayJob CRD not found, skipping test (requires KubeRay operator).');
        skipTest = true;
      } else {
        cy.log('RayJob CRD confirmed.');
      }
    });

    cy.then(() => {
      if (skipTest) {
        return;
      }

      cy.fixture('e2e/modelTraining/rayJobs/testRayjobPauseScale.yaml', 'utf8')
        .then((yamlContent: string) => {
          testData = yaml.load(yamlContent) as RayJobE2eTestData;

          projectName = `${testData.projectName}-${uuid}`;
          rayJobName = `${testData.rayJobName}-${uuid}`;
          flavorName = `${testData.flavorName}-${uuid}`;
          clusterQueueName = `${testData.clusterQueueName}-${uuid}`;
          localQueueName = `${testData.localQueueName}-${uuid}`;
          workerGroupName = testData.workerGroupName;
          cpuQuota = testData.cpuQuota;
          memoryQuota = testData.memoryQuota;
          gpuQuota = testData.gpuQuota;
          rayImage = testData.rayImage;
          rayVersion = testData.rayVersion;

          cy.log(`Test configuration loaded for project: ${projectName}`);
        })
        .then(() => {
          cy.step('Create testing project');
          createCleanProject(projectName);
        })
        .then(() => {
          cy.step('Setup Kueue resources and RayJob');
          setupRayJobResources({
            namespace: projectName,
            rayJobName,
            flavorName,
            clusterQueueName,
            localQueueName,
            cpuQuota,
            memoryQuota,
            gpuQuota,
            workerGroupName,
            rayImage,
            rayVersion,
          });
        });
    });
  });

  after(() => {
    if (skipTest) {
      cy.log('Skipping cleanup: Tests were skipped');
      return;
    }

    if (projectName) {
      cy.step('Delete project');
      deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
    } else {
      cy.log('Skipping project delete: projectName was not initialized');
    }

    if (projectName && localQueueName && clusterQueueName && flavorName) {
      cy.step('Delete Kueue resources');
      deleteKueueResources(localQueueName, clusterQueueName, flavorName, projectName, {
        ignoreNotFound: true,
      });
    } else {
      cy.log(
        'Skipping Kueue cleanup: missing one of projectName, localQueueName, clusterQueueName, flavorName',
      );
    }
  });

  it(
    'Should pause running RayJob, scale worker count, and delete the job',
    {
      tags: ['@Sanity', '@SanitySet1', '@ModelTraining', '@RayJob', '@RHOAIENG-56125'],
    },
    function verifyRayJobPauseScaleAndDelete() {
      if (skipTest) {
        this.skip();
      }

      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Jobs');
      modelTrainingGlobal.navigate();

      cy.step('Select the project');
      modelTrainingGlobal.selectProject(projectName);

      cy.step('Filter to RayJob rows');
      trainingJobTable.findTable().should('be.visible');
      trainingJobTable.selectJobTypeFilter('RayJob');

      cy.step('Verify RayJob appears in the table');
      trainingJobTable.getTableRow(rayJobName).findTrainingJobName().should('exist');

      cy.step('Wait for RayJob to be Running');
      trainingJobTable
        .getTableRow(rayJobName)
        .findStatus()
        .contains(RayJobState.RUNNING, { timeout: 300000 })
        .should('be.visible');

      cy.step('Open Ray job status modal');
      trainingJobTable.getTableRow(rayJobName).findStatus().click();

      cy.step('Verify Ray job status modal opens');
      rayJobStatusModal.shouldBeOpen();

      cy.step('Pause the running RayJob');
      rayJobStatusModal.findPauseJobButton().should('be.visible').click();

      cy.step('Confirm pause in the Ray pause modal');
      pauseRayJobModal.shouldBeOpen();
      pauseRayJobModal.findPauseButton().should('be.visible').and('be.enabled').click();

      cy.step('Wait for pause modal to close');
      pauseRayJobModal.shouldBeOpen(false);

      cy.step('Wait for status modal to close');
      rayJobStatusModal.shouldBeOpen(false);

      cy.step('Wait for job status to show Paused in the table');
      trainingJobTable
        .getTableRow(rayJobName)
        .findStatus()
        .contains(RayJobState.PAUSED, { timeout: 120000 })
        .should('be.visible');

      cy.step('Open RayJob details drawer');
      trainingJobTable.getTableRow(rayJobName).findNameLink().click();

      cy.step('Verify Ray job details drawer opens');
      rayJobDetailsDrawer.shouldBeOpen();

      cy.step('Open Resources tab');
      rayJobDetailsDrawer.selectTab('Resources');

      cy.step('Verify initial node count in Resources tab (head + workers)');
      rayJobResourcesTab.findWorkerGroupTitle(workerGroupName).should('exist');
      rayJobResourcesTab.findNodesValue().should('contain', INITIAL_TOTAL_NODES.toString());

      cy.step('Open Edit node count from Resources tab (inline action)');
      rayJobResourcesTab.findNodesEditButton().should('be.visible').click();

      cy.step('Verify edit node count modal');
      editRayJobNodeCountModal.shouldBeOpen();
      editRayJobNodeCountModal
        .findWorkerGroupInput(workerGroupName)
        .should('have.value', INITIAL_WORKER_REPLICAS.toString());

      cy.step(
        `Scale ${workerGroupName} from ${INITIAL_WORKER_REPLICAS} to ${UPDATED_WORKER_REPLICAS}`,
      );
      editRayJobNodeCountModal.findWorkerGroupPlusButton(workerGroupName).click();
      editRayJobNodeCountModal
        .findWorkerGroupInput(workerGroupName)
        .should('have.value', UPDATED_WORKER_REPLICAS.toString());
      editRayJobNodeCountModal.findSaveButton().should('be.enabled').click();

      cy.step('Wait for edit node count modal to close');
      editRayJobNodeCountModal.shouldBeClosed();

      cy.step('Verify updated node count in UI');
      rayJobResourcesTab.findNodesValue().should('contain', UPDATED_TOTAL_NODES.toString());

      cy.step('Verify RayJob worker replicas on the cluster');
      getRayJobWorkerReplicas(rayJobName, projectName).then((replicas) => {
        expect(replicas).to.equal(UPDATED_WORKER_REPLICAS);
      });

      cy.step('Close the details drawer');
      rayJobDetailsDrawer.close();

      cy.step('Verify updated node count in Jobs table (Nodes column)');
      trainingJobTable
        .getTableRow(rayJobName)
        .findNodes()
        .should('contain', UPDATED_TOTAL_NODES.toString());

      cy.step('Delete RayJob via row kebab menu');
      const rayRow = trainingJobTable.getTableRow(rayJobName);
      rayRow.findKebabButton().click();
      rayRow.findKebabMenuItem('Delete job').click();

      cy.step('Confirm deletion in modal');
      deleteModal.shouldBeOpen();
      deleteModal.findInput().type(rayJobName);
      deleteModal.findSubmitButton().should('be.enabled').click();

      cy.step('Verify RayJob is removed from the UI');
      trainingJobTable.findEmptyState().should('be.visible');

      cy.step('Verify RayJob is deleted on the cluster');
      verifyRayJobDeleted(rayJobName, projectName);
    },
  );
});
