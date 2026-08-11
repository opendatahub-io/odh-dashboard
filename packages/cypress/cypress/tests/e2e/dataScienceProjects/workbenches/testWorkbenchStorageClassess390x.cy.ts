import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import {
  provisionClusterStorageSCFeature,
  tearDownClusterStorageSCFeature,
} from '../../../../utils/storageClass';
import {
  workbenchPage,
  workbenchActions,
  createSpawnerPage,
  attachExistingStorageModal,
} from '../../../../pages/workbench';
import { clusterStorage, addClusterStorageModal } from '../../../../pages/clusterStorage';
import { projectDetails, projectListPage } from '../../../../pages/projects';
import { retryableBefore } from '../../../../utils/retryableHooks';
import type { WBStorageClassesTestData } from '../../../../types';
import { selectNotebookImageWithBackendFallback } from '../../../../utils/oc_commands/imageStreams';
import { loadWBStorageClassesFixture } from '../../../../utils/dataLoader';
import { generateTestUUID } from '../../../../utils/uuidGenerator';

describe('Workbench Storage Classes Tests - s390x', () => {
  let projectName: string;
  let notebookImage: string;
  const uuid = generateTestUUID();

  // Storage class
  let storageClassRWO: string;

  // Workbench
  let workbenchNameRWO: string;

  // Storage
  let storageNameRWO: string;

  // Mount path
  let mountPathA: string;

  retryableBefore(() => {
    return loadWBStorageClassesFixture(
      'e2e/dataScienceProjects/testWorkbenchStorageClassess390x.yaml',
    )
      .then((fixtureData: WBStorageClassesTestData) => {
        cy.log('Loaded s390x test data from fixtures');

        projectName = `${fixtureData.projectName}-${uuid}`;
        storageClassRWO = fixtureData.storageClassRWO;
        workbenchNameRWO = fixtureData.workbenchRWO;
        storageNameRWO = fixtureData.storageRWO;
        mountPathA = fixtureData.mountPathA;
        notebookImage = fixtureData.notebookImage;
      })
      .then(() => {
        cy.step('Provisioning project');
        provisionClusterStorageSCFeature(projectName, HTPASSWD_CLUSTER_ADMIN_USER.USERNAME);
      });
  });

  after(() => {
    cy.step('Cleaning up project');
    tearDownClusterStorageSCFeature(projectName);
  });

  beforeEach(() => {
    cy.step('Log into the application');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

    cy.step(`Navigate to the Project list tab and search for ${projectName}`);
    projectListPage.navigate();
    projectListPage.filterProjectByName(projectName);
    projectListPage.findProjectLink(projectName).click();
  });

  it(
    'Create workbench with RWO storage and verify storage attachment',
    {
      tags: ['@Smoke', '@SmokeSet1', '@Storage', '@ODS-1931', '@Dashboard', '@Workbenches'],
    },
    () => {
      cy.step('Navigate to cluster storage and create RWO storage');

      projectDetails.findSectionTab('cluster-storages').click();
      clusterStorage.findAddClusterStorageButton().click();

      addClusterStorageModal.findNameInput().type(storageNameRWO);
      const storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(storageClassRWO, 'i'));

      cy.step('Submit the form');
      addClusterStorageModal.findSubmitButton().should('not.be.disabled').click();

      cy.step('Create workbench and attach RWO storage');
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();

      createSpawnerPage.getNameInput().fill(workbenchNameRWO);

      selectNotebookImageWithBackendFallback(notebookImage, createSpawnerPage).then(() => {
        cy.step('Attach RWO storage to workbench');

        createSpawnerPage.findAttachExistingStorageButton().click();
        attachExistingStorageModal.findStandardPathInput().fill(mountPathA);
        attachExistingStorageModal.findAttachButton().click();
        createSpawnerPage.findSubmitButton().click();

        cy.step('Verify workbench is running with attached RWO storage');
        const notebookRow = workbenchPage.getNotebookRow(workbenchNameRWO);

        cy.step('Open workbench edit view');
        notebookRow.findKebab().click();
        workbenchActions.findEditWorkbenchAction().click();

        cy.step('Navigate to Cluster storage');
        cy.contains('button, a, li', 'Cluster storage').should('be.visible').scrollIntoView();
        cy.contains('button, a, li', 'Cluster storage').click();

        createSpawnerPage.findSubmitButton().click();
      });
    },
  );
});
