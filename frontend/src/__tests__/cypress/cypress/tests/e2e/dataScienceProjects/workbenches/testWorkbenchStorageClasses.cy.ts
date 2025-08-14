import { StorageProvisioner } from '@odh-dashboard/internal/pages/storageClasses/storageEnums';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  provisionStorageClass,
  tearDownStorageClassFeature,
  provisionClusterStorageSCFeature,
  tearDownClusterStorageSCFeature,
} from '#~/__tests__/cypress/cypress/utils/storageClass';
import {
  workbenchPage,
  createSpawnerPage,
  attachExistingStorageModal,
} from '#~/__tests__/cypress/cypress/pages/workbench';
import {
  clusterStorage,
  addClusterStorageModal,
} from '#~/__tests__/cypress/cypress/pages/clusterStorage';
import { projectDetails, projectListPage } from '#~/__tests__/cypress/cypress/pages/projects';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import type { SCAccessMode } from '#~/__tests__/cypress/cypress/types';
import { selectNotebookImageWithBackendFallback } from '#~/__tests__/cypress/cypress/utils/oc_commands/imageStreams';

describe('Workbench Storage Classes Tests', () => {
  const createdStorageClasses: string[] = [];
  const projectName = 'test-workbench-storage-preset';

  const scRWOName = 'sc-rwo-preset';

  retryableBefore(() => {
    cy.step('Provisioning storage class');
    const scRWO: SCAccessMode = {
      ReadWriteOnce: true,
      ReadWriteMany: true,
    };
    provisionStorageClass(scRWOName, StorageProvisioner.VSPHERE_VOLUME, scRWO);
    createdStorageClasses.push(scRWOName);

    cy.step('Provisioning data science project');
    provisionClusterStorageSCFeature(projectName, HTPASSWD_CLUSTER_ADMIN_USER.USERNAME);
  });

  after(() => {
    if (createdStorageClasses.length > 0) {
      cy.step('Cleaning up storage classes');
      tearDownStorageClassFeature(createdStorageClasses);
    }
    cy.step('Cleaning up data science project');
    tearDownClusterStorageSCFeature(projectName);
  });

  beforeEach(() => {
    cy.step('Log into the application');
    cy.visitWithLogin('/projects', HTPASSWD_CLUSTER_ADMIN_USER);

    cy.step(`Navigate to the Project list tab and search for ${projectName}`);
    projectListPage.filterProjectByName(projectName);
    projectListPage.findProjectLink(projectName).click();
  });

  it(
    'Create workbench with RWO storage and verify storage attachment',
    { tags: ['@Storage', '@ODS-1931', '@Dashboard', '@Workbenches'] },
    () => {
      const workbenchName = 'wb-rwo-storage';
      const storageName = 'rwo-storage';
      const mountPath = 'mnt/different-path';
      let selectedImageStream: string;

      cy.step('Navigate to cluster storage and create RWO storage');
      projectDetails.findSectionTab('cluster-storages').click();
      clusterStorage.findCreateButton().click();
      addClusterStorageModal.findNameInput().type(storageName);

      const storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(scRWOName, 'i'));

      cy.step('Submit the form');
      addClusterStorageModal.findSubmitButton().should('not.be.disabled').click();

      cy.step('Create workbench and attach RWO storage');
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().fill(workbenchName);

      selectNotebookImageWithBackendFallback('code-server-notebook', createSpawnerPage).then(
        (imageStreamName: string) => {
          selectedImageStream = imageStreamName;
          cy.log(`Selected imagestream: ${selectedImageStream}`);
          cy.step('Attach RWO storage to workbench');
          createSpawnerPage.findAttachExistingStorageButton().click();
          attachExistingStorageModal.findStandardPathInput().fill(mountPath);
          attachExistingStorageModal.findAttachButton().should('be.enabled');
          attachExistingStorageModal.findAttachButton().click();
          createSpawnerPage.findSubmitButton().click();

          cy.step('Verify workbench is running with attached RWO storage');
          const notebookRow = workbenchPage.getNotebookRow(workbenchName);

          cy.step('Verify RWO storage details in workbench edit view');
          notebookRow.findKebab().click();
          notebookRow.findKebabAction('Edit workbench').click();

          createSpawnerPage
            .getStorageTable()
            .find()
            .within(() => {
              cy.contains(storageName).should('exist');
              cy.contains('ReadWriteOnce').should('exist');
            });

          createSpawnerPage.findSubmitButton().click();
        },
      );
    },
  );
});
