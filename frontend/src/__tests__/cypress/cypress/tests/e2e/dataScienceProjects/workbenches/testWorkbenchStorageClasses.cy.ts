// eslint-disable-next-line @odh-dashboard/no-restricted-imports
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
  storageModal,
} from '#~/__tests__/cypress/cypress/pages/workbench';
import {
  clusterStorage,
  addClusterStorageModal,
} from '#~/__tests__/cypress/cypress/pages/clusterStorage';
import { projectDetails, projectListPage } from '#~/__tests__/cypress/cypress/pages/projects';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import type { SCAccessMode, WBStorageClassesTestData } from '#~/__tests__/cypress/cypress/types';
import { selectNotebookImageWithBackendFallback } from '#~/__tests__/cypress/cypress/utils/oc_commands/imageStreams';
import { findAddClusterStorageButton } from '#~/__tests__/cypress/cypress/utils/clusterStorage';
import { loadWBStorageClassesFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';

describe('Workbench Storage Classes Tests', () => {
  let testData: WBStorageClassesTestData;
  const createdStorageClasses: string[] = [];

  retryableBefore(() => {
    // Load test data from fixtures
    return loadWBStorageClassesFixture('e2e/dataScienceProjects/testWorkbenchStorageClasses.yaml')
      .then((fixtureData: WBStorageClassesTestData) => {
        testData = fixtureData;
        cy.log('Loaded test data from fixtures');
      })
      .then(() => {
        cy.step('Provisioning storage class');
        const scRWO: SCAccessMode = {
          ReadWriteOnce: true,
          ReadWriteMany: true,
        };
        provisionStorageClass(testData.storageClassRWO, StorageProvisioner.VSPHERE_VOLUME, scRWO);
        // Only add if not already in the array (prevent duplicates on retry)
        if (!createdStorageClasses.includes(testData.storageClassRWO)) {
          createdStorageClasses.push(testData.storageClassRWO);
        }

        cy.step('Provisioning project');
        provisionClusterStorageSCFeature(
          testData.projectName,
          HTPASSWD_CLUSTER_ADMIN_USER.USERNAME,
        );
      });
  });

  after(() => {
    if (createdStorageClasses.length > 0) {
      cy.step('Cleaning up storage classes');
      tearDownStorageClassFeature(createdStorageClasses);
    }
    cy.step('Cleaning up project');
    tearDownClusterStorageSCFeature(testData.projectName);
  });

  beforeEach(() => {
    cy.step('Log into the application');
    cy.visitWithLogin('/projects', HTPASSWD_CLUSTER_ADMIN_USER);

    cy.step(`Navigate to the Project list tab and search for ${testData.projectName}`);
    projectListPage.filterProjectByName(testData.projectName);
    projectListPage.findProjectLink(testData.projectName).click();
  });

  it(
    'Create workbench with RWO storage and verify storage attachment',
    { tags: ['@Storage', '@ODS-1931', '@Dashboard', '@Workbenches'] },
    () => {
      const workbenchName = testData.workbenchRWO;
      const storageName = testData.storageRWO;
      const mountPath = testData.mountPathA;
      let selectedImageStream: string;

      cy.step('Navigate to cluster storage and create RWO storage');
      projectDetails.findSectionTab('cluster-storages').click();
      findAddClusterStorageButton().click();
      addClusterStorageModal.findNameInput().type(storageName);

      const storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(testData.storageClassRWO, 'i'));

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
          attachExistingStorageModal.findAttachButton().click();
          createSpawnerPage.findSubmitButton().click();

          cy.step('Verify workbench is running with attached RWO storage');
          const notebookRow = workbenchPage.getNotebookRow(workbenchName);

          cy.step('Verify RWO storage details in workbench edit view');
          notebookRow.findKebab().click();
          notebookRow.findKebabAction('Edit workbench').click();

          cy.step('Verify storage access mode in table');
          const storageTable = createSpawnerPage.getStorageTable();
          storageTable.verifyStorageAccessMode(storageName, 'ReadWriteOnce');

          createSpawnerPage.findSubmitButton().click();
        },
      );
    },
  );

  it(
    'Display access mode information when selecting storage to attach to workbench',
    { tags: ['@Storage', '@Dashboard', '@Workbenches'] },
    () => {
      // Use fixtures for consistent test data - construct storage names with access mode suffix
      const storageRWO = `${testData.storageMultiAccessA}-rwo`;
      const storageRWX = `${testData.storageMultiAccessA}-rwx`;
      const storageROX = `${testData.storageMultiAccessA}-rox`;
      const rwoMountPath = testData.mountPathA;
      const rwxMountPath = testData.mountPathB;
      const roxMountPath = testData.mountPathC;
      const scMultiAccessName = testData.storageClassMultiA;

      // Access mode labels
      const rwoLabel = 'ReadWriteOnce';
      const rwxLabel = 'ReadWriteMany';
      const roxLabel = 'ReadOnlyMany';

      // Create storage class with multi-access support
      const scMultiAccess: SCAccessMode = {
        ReadWriteOnce: true,
        ReadWriteMany: true,
        ReadOnlyMany: true,
      };
      provisionStorageClass(scMultiAccessName, StorageProvisioner.AZURE_FILE, scMultiAccess);
      // Only add if not already in the array (prevent duplicates on retry)
      if (!createdStorageClasses.includes(scMultiAccessName)) {
        createdStorageClasses.push(scMultiAccessName);
      }

      cy.step('Create storages with different access modes');
      projectDetails.findSectionTab('cluster-storages').click();

      // RWO storage
      findAddClusterStorageButton().click();
      addClusterStorageModal.findNameInput().type(storageRWO);
      let storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(scMultiAccessName, 'i'));
      addClusterStorageModal.findRWOAccessMode().click();
      addClusterStorageModal.findSubmitButton().click();
      clusterStorage.getClusterStorageRow(storageRWO).find().should('exist');

      // RWX storage
      findAddClusterStorageButton().click();
      addClusterStorageModal.findNameInput().type(storageRWX);
      storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(scMultiAccessName, 'i'));
      addClusterStorageModal.findRWXAccessMode().click();
      addClusterStorageModal.findSubmitButton().click();
      clusterStorage.getClusterStorageRow(storageRWX).find().should('exist');

      // ROX storage
      findAddClusterStorageButton().click();
      addClusterStorageModal.findNameInput().type(storageROX);
      storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(scMultiAccessName, 'i'));
      addClusterStorageModal.findROXAccessMode().click();
      addClusterStorageModal.findSubmitButton().click();
      clusterStorage.getClusterStorageRow(storageROX).find().should('exist');

      cy.step('Open workbench creation form');
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().fill(testData.workbenchMultiAccessA);

      selectNotebookImageWithBackendFallback('code-server-notebook', createSpawnerPage).then(() => {
        cy.step('Open attach storage modal');
        createSpawnerPage.findAttachExistingStorageButton().click();

        cy.step(`Select RWO storage and verify ${rwoLabel} is displayed`);
        attachExistingStorageModal.selectExistingPersistentStorage(storageRWO);
        attachExistingStorageModal.find().within(() => {
          cy.contains(rwoLabel).should('exist');
        });
        attachExistingStorageModal.findStandardPathInput().fill(rwoMountPath);
        attachExistingStorageModal.findAttachButton().click();

        cy.step(`Select RWX storage and verify ${rwxLabel} is displayed`);
        createSpawnerPage.findAttachExistingStorageButton().click();
        attachExistingStorageModal.selectExistingPersistentStorage(storageRWX);
        attachExistingStorageModal.find().within(() => {
          cy.contains(rwxLabel).should('exist');
        });
        attachExistingStorageModal.findStandardPathInput().fill(rwxMountPath);
        attachExistingStorageModal.findAttachButton().click();

        cy.step(`Select ROX storage and verify ${roxLabel} is displayed`);
        createSpawnerPage.findAttachExistingStorageButton().click();
        attachExistingStorageModal.selectExistingPersistentStorage(storageROX);
        attachExistingStorageModal.find().within(() => {
          cy.contains(roxLabel).should('exist');
        });
        attachExistingStorageModal.findStandardPathInput().fill(roxMountPath);
        attachExistingStorageModal.findAttachButton().click();
      });

      cy.step('Verify storages are attached to workbench');
      const storageTable = createSpawnerPage.getStorageTable();
      storageTable.verifyStorageAccessMode(storageRWO, rwoLabel);
      storageTable.verifyStorageAccessMode(storageRWX, rwxLabel);
      storageTable.verifyStorageAccessMode(storageROX, roxLabel);
    },
  );

  it(
    'Create new storage with different access modes during workbench creation',
    { tags: ['@Storage', '@Dashboard', '@Workbenches'] },
    () => {
      // Use fixtures for consistent test data - construct storage names with access mode suffix
      const workbenchName = testData.workbenchMultiAccessB;
      const rwoStorageName = `${testData.storageMultiAccessB}-rwo`;
      const rwxStorageName = `${testData.storageMultiAccessB}-rwx`;
      const roxStorageName = `${testData.storageMultiAccessB}-rox`;
      const rwoMountPath = testData.mountPathA;
      const rwxMountPath = testData.mountPathB;
      const roxMountPath = testData.mountPathC;
      const scMultiAccessName = testData.storageClassMultiB;

      // Access mode labels
      const rwoLabel = 'ReadWriteOnce';
      const rwxLabel = 'ReadWriteMany';
      const roxLabel = 'ReadOnlyMany';

      // Create storage class with multi-access support
      const scMultiAccess: SCAccessMode = {
        ReadWriteOnce: true,
        ReadWriteMany: true,
        ReadOnlyMany: true,
      };
      provisionStorageClass(scMultiAccessName, StorageProvisioner.AZURE_FILE, scMultiAccess);
      // Only add if not already in the array (prevent duplicates on retry)
      if (!createdStorageClasses.includes(scMultiAccessName)) {
        createdStorageClasses.push(scMultiAccessName);
      }

      cy.step('Open workbench creation form');
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().fill(workbenchName);

      selectNotebookImageWithBackendFallback('code-server-notebook', createSpawnerPage).then(() => {
        cy.step('Create new storage with RWO access mode');
        createSpawnerPage.findCreateStorageButton().click();
        storageModal.findNameInput().type(rwoStorageName);
        let storageClassSelect = storageModal.findStorageClassSelect();
        storageClassSelect.find().click();
        storageClassSelect.selectStorageClassSelectOption(new RegExp(scMultiAccessName, 'i'));
        storageModal.findRWOAccessMode().click();
        storageModal.findMountField().fill(rwoMountPath);
        storageModal.findSubmitButton().click();

        cy.step('Create new storage with RWX access mode');
        createSpawnerPage.findCreateStorageButton().click();
        storageModal.findNameInput().type(rwxStorageName);
        storageClassSelect = storageModal.findStorageClassSelect();
        storageClassSelect.find().click();
        storageClassSelect.selectStorageClassSelectOption(new RegExp(scMultiAccessName, 'i'));
        storageModal.findRWXAccessMode().click();
        storageModal.findMountField().fill(rwxMountPath);
        storageModal.findSubmitButton().click();

        cy.step('Create new storage with ROX access mode');
        createSpawnerPage.findCreateStorageButton().click();
        storageModal.findNameInput().type(roxStorageName);
        storageClassSelect = storageModal.findStorageClassSelect();
        storageClassSelect.find().click();
        storageClassSelect.selectStorageClassSelectOption(new RegExp(scMultiAccessName, 'i'));
        storageModal.findROXAccessMode().click();
        storageModal.findMountField().fill(roxMountPath);
        storageModal.findSubmitButton().click();

        cy.step('Verify storages are created with the correct access modes');
        const storageTable = createSpawnerPage.getStorageTable();
        storageTable.verifyStorageAccessMode(rwoStorageName, rwoLabel);
        storageTable.verifyStorageAccessMode(rwxStorageName, rwxLabel);
        storageTable.verifyStorageAccessMode(roxStorageName, roxLabel);
      });
    },
  );
});
