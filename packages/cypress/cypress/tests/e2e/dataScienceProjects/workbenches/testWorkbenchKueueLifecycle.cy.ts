import { LDAP_ADMIN_USER } from '../../../../utils/e2eUsers';
import {
  deleteOpenShiftProject,
  createOpenShiftProject,
} from '../../../../utils/oc_commands/project';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { loadKueueWorkbenchLifecycleFixture } from '../../../../utils/dataLoader';
import {
  setupKueueWorkbenchResources,
  cleanupKueueWorkbenchResources,
  updateClusterQueueQuota,
  type KueueWorkbenchConfig,
} from '../../../../utils/oc_commands/kueueWorkbench';
import { projectDetails, projectListPage } from '../../../../pages/projects';
import {
  workbenchPage,
  createSpawnerPage,
  workbenchStatusModal,
} from '../../../../pages/workbench';
import { selectNotebookImageWithBackendFallback } from '../../../../utils/oc_commands/imageStreams';
import type { KueueWorkbenchLifecycleTestData } from '../../../../types';

describe('Workbench Kueue Lifecycle Tests', () => {
  let testData: KueueWorkbenchConfig;
  let fixtureData: KueueWorkbenchLifecycleTestData;
  let projectName: string;
  let sectionTab: string;
  let notebookImage: string;
  const uuid = generateTestUUID();
  const workbenchName = `kueue-lifecycle-wb-${uuid}`;

  retryableBefore(() =>
    loadKueueWorkbenchLifecycleFixture('e2e/kueueWorkbench/testKueueWorkbenchLifecycle.yaml').then(
      (data) => {
        fixtureData = data;
        projectName = `${data.projectName}-${uuid}`;
        sectionTab = data.sectionTab;
        notebookImage = data.notebookImage;
        testData = {
          flavorName: `${data.flavorName}-${uuid}`,
          clusterQueueName: `${data.clusterQueueName}-${uuid}`,
          localQueueName: `${data.localQueueName}-${uuid}`,
          hardwareProfileName: `${data.hardwareProfileName}-${uuid}`,
          hardwareProfileDisplayName: `${data.hardwareProfileDisplayName} ${uuid}`,
          cpuQuota: data.cpuQuota,
          memoryQuota: data.memoryQuota,
        };
        return deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true })
          .then(() => createOpenShiftProject(projectName))
          .then(() => setupKueueWorkbenchResources(testData, projectName));
      },
    ),
  );

  after(() => {
    cleanupKueueWorkbenchResources(testData, projectName);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Verify workbench Kueue lifecycle: Queued → Ready after quota update',
    { tags: ['@Kueue', '@Dashboard', '@Workbenches', '@Featureflagged'] },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/?devFeatureFlags=true', LDAP_ADMIN_USER);

      cy.step(`Navigate to workbenches tab of project ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab(sectionTab).click();

      cy.step('Click Create workbench button');
      workbenchPage.findCreateButton().click();

      cy.step('Enter workbench name');
      createSpawnerPage.getNameInput().fill(workbenchName);

      cy.step('Select a notebook image');
      selectNotebookImageWithBackendFallback(notebookImage, createSpawnerPage);

      cy.step('Verify Kueue hardware profile is pre-selected');
      createSpawnerPage
        .findHardwareProfileSelect()
        .should('contain.text', testData.hardwareProfileDisplayName);

      cy.step('Submit the workbench creation');
      createSpawnerPage.findSubmitButton().click();

      cy.step('Wait for notebook table to appear');
      workbenchPage.findNotebookTable(30000).should('exist');

      cy.step('Verify workbench shows Queued status');
      const notebookRow = workbenchPage.getNotebookRow(workbenchName);
      notebookRow.expectStatusLabelToBe('Queued', 120000);

      cy.step('Verify status subtitle shows waiting for quota message');
      notebookRow
        .findNotebookStatusSubtitle()
        .should('contain.text', fixtureData.waitingForQuotaMessage);

      cy.step('Verify queue position is displayed');
      notebookRow
        .findNotebookStatusSubtitle()
        .should('contain.text', fixtureData.queuePositionMarker);

      cy.step('Click on the Queued status label to open the status modal');
      notebookRow.findHaveNotebookStatusText().click();

      cy.step('Verify status modal is visible');
      workbenchStatusModal.find().should('be.visible');

      cy.step('Verify Resources tab is visible and click it');
      workbenchStatusModal.findResourcesTab().should('be.visible');
      workbenchStatusModal.findResourcesTab().click();

      cy.step('Verify ClusterQueue section is visible with queue name');
      workbenchStatusModal.findClusterQueueSection().should('be.visible');
      workbenchStatusModal.findQueueValue().should('contain.text', testData.clusterQueueName);

      cy.step('Verify quotas section is visible');
      workbenchStatusModal.findQuotasSection().should('be.visible');

      cy.step('Close the status modal');
      workbenchStatusModal.getModalCloseButton().click();

      cy.step('Update the ClusterQueue quota to allow the workbench');
      updateClusterQueueQuota(
        testData.clusterQueueName,
        fixtureData.updatedCpuQuota,
        fixtureData.updatedMemoryQuota,
      );

      cy.step('Wait for workbench to transition to Ready status');
      notebookRow.expectStatusLabelToBe('Ready', 300000);

      cy.step('Verify hardware profile is displayed after Ready');
      notebookRow.shouldHaveHardwareProfile(testData.hardwareProfileDisplayName);
    },
  );
});
