import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import {
  deleteOpenShiftProject,
  createOpenShiftProject,
} from '../../../../utils/oc_commands/project';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { loadKueueWorkbenchFixture } from '../../../../utils/dataLoader';
import {
  setupKueueWorkbenchResources,
  cleanupKueueWorkbenchResources,
  verifyWorkloadAdmitted,
  type KueueWorkbenchConfig,
} from '../../../../utils/oc_commands/kueueWorkbench';
import { projectDetails, projectListPage } from '../../../../pages/projects';
import {
  workbenchPage,
  createSpawnerPage,
  workbenchStatusModal,
} from '../../../../pages/workbench';
import { NotebookStatusLabel } from '../../../../types';
import { selectNotebookImageWithBackendFallback } from '../../../../utils/oc_commands/imageStreams';

describe('Workbench Kueue Integration Tests', () => {
  let testData: KueueWorkbenchConfig;
  let projectName: string;
  let sectionTab: string;
  let notebookImage: string;
  const uuid = generateTestUUID();
  const workbenchName = `kueue-workbench-${uuid}`;

  retryableBefore(() =>
    loadKueueWorkbenchFixture('e2e/kueueWorkbench/testKueueWorkbench.yaml')
      .then((fixtureData) => {
        projectName = `${fixtureData.projectName}-${uuid}`;
        sectionTab = fixtureData.sectionTab;
        notebookImage = fixtureData.notebookImage;
        testData = {
          flavorName: `${fixtureData.flavorName}-${uuid}`,
          clusterQueueName: `${fixtureData.clusterQueueName}-${uuid}`,
          localQueueName: `${fixtureData.localQueueName}-${uuid}`,
          hardwareProfileName: `${fixtureData.hardwareProfileName}-${uuid}`,
          hardwareProfileDisplayName: `${fixtureData.hardwareProfileDisplayName} ${uuid}`,
          cpuQuota: fixtureData.cpuQuota,
          memoryQuota: fixtureData.memoryQuota,
        };
        return deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true });
      })
      .then(() => createOpenShiftProject(projectName))
      .then(() => setupKueueWorkbenchResources(testData, projectName)),
  );

  after(() => {
    cleanupKueueWorkbenchResources(testData, projectName);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Create workbench with Kueue hardware profile and verify status',
    { tags: ['@Kueue', '@Dashboard', '@Workbenches', '@Featureflagged'] },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/?devFeatureFlags=true', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Navigate to workbenches tab of project ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab(sectionTab).click();

      cy.step('Click Create workbench button');
      workbenchPage.findCreateButton().click();

      cy.step('Enter workbench name');
      createSpawnerPage.getNameInput().fill(workbenchName);

      cy.step('Verify Kueue hardware profile is pre-selected');
      createSpawnerPage
        .findHardwareProfileSelect()
        .should('contain.text', testData.hardwareProfileDisplayName);

      cy.step('Select a notebook image');
      selectNotebookImageWithBackendFallback(notebookImage, createSpawnerPage);

      cy.step('Submit the workbench creation');
      createSpawnerPage.findSubmitButton().click();

      cy.step('Wait for workbench to reach Running status');
      const notebookRow = workbenchPage.getNotebookRow(workbenchName);
      notebookRow.expectStatusLabelToBe(NotebookStatusLabel.Ready, 300000);

      cy.step('Verify Kueue Workload CR exists and is admitted');
      verifyWorkloadAdmitted(projectName);

      cy.step('Verify hardware profile column shows the Kueue profile name');
      notebookRow.shouldHaveHardwareProfile(testData.hardwareProfileDisplayName);
    },
  );

  it(
    'Verify workbench status modal has Resources tab with Kueue info',
    { tags: ['@Kueue', '@Dashboard', '@Workbenches', '@Featureflagged'] },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/?devFeatureFlags=true', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Navigate to workbenches tab of project ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab(sectionTab).click();

      cy.step('Click on workbench status to open modal');
      const notebookRow = workbenchPage.getNotebookRow(workbenchName);
      notebookRow.findHaveNotebookStatusText().click();

      cy.step('Verify status modal is visible');
      workbenchStatusModal.find().should('be.visible');

      cy.step('Verify Resources tab is visible');
      workbenchStatusModal.findResourcesTab().should('be.visible');

      cy.step('Click Resources tab and verify queue information');
      workbenchStatusModal.findResourcesTab().click();
      workbenchStatusModal.findClusterQueueSection().should('be.visible');
      workbenchStatusModal.findQueueValue().should('contain.text', testData.clusterQueueName);
      workbenchStatusModal.findQuotasSection().should('be.visible');
    },
  );
});
