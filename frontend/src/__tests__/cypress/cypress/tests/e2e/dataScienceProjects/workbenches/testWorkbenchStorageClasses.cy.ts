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
import type { SCAccessMode } from '#~/__tests__/cypress/cypress/types';
import { selectNotebookImageWithBackendFallback } from '#~/__tests__/cypress/cypress/utils/oc_commands/imageStreams';
import { findAddClusterStorageButton } from '#~/__tests__/cypress/cypress/utils/clusterStorage';

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

    cy.step('Provisioning project');
    provisionClusterStorageSCFeature(projectName, HTPASSWD_CLUSTER_ADMIN_USER.USERNAME);
  });

  after(() => {
    if (createdStorageClasses.length > 0) {
      cy.step('Cleaning up storage classes');
      tearDownStorageClassFeature(createdStorageClasses);
    }
    cy.step('Cleaning up project');
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

  it(
    'Display access mode information when selecting storage to attach to workbench',
    { tags: ['@Storage', '@Dashboard', '@Workbenches'] },
    () => {
      const storageRWO = 'rwo-storage-attach';
      const storageRWX = 'rwx-storage-attach';
      const storageROX = 'rox-storage-attach';

      // Create storage classes
      const scMultiAccessName = 'sc-multi';
      const scMultiAccess: SCAccessMode = {
        ReadWriteOnce: true,
        ReadWriteMany: true,
        ReadOnlyMany: true,
      };
      provisionStorageClass(scMultiAccessName, StorageProvisioner.AZURE_FILE, scMultiAccess);
      createdStorageClasses.push(scMultiAccessName);

      const rwoMountPath = 'rwo-mount-path';
      const roxMountPath = 'rox-mount-path';
      const rwxMountPath = 'rwx-mount-path';

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
      createSpawnerPage.getNameInput().fill('wb-attach-storage');

      selectNotebookImageWithBackendFallback('code-server-notebook', createSpawnerPage).then(() => {
        cy.step('Open attach storage modal');
        createSpawnerPage.findAttachExistingStorageButton().click();

        cy.step('Select RWO storage and verify ReadWriteOnce is displayed');
        attachExistingStorageModal.selectExistingPersistentStorage(storageRWO);
        attachExistingStorageModal.find().within(() => {
          cy.contains('ReadWriteOnce').should('exist');
        });
        attachExistingStorageModal.findStandardPathInput().fill(rwoMountPath);
        attachExistingStorageModal.findAttachButton().click();

        cy.step('Select RWX storage and verify ReadWriteMany is displayed');
        createSpawnerPage.findAttachExistingStorageButton().click();
        attachExistingStorageModal.selectExistingPersistentStorage(storageRWX);
        attachExistingStorageModal.find().within(() => {
          cy.contains('ReadWriteMany').should('exist');
        });
        attachExistingStorageModal.findStandardPathInput().fill(rwxMountPath);
        attachExistingStorageModal.findAttachButton().click();

        cy.step('Select ROX storage and verify ReadOnlyMany is displayed');
        createSpawnerPage.findAttachExistingStorageButton().click();
        attachExistingStorageModal.selectExistingPersistentStorage(storageROX);
        attachExistingStorageModal.find().within(() => {
          cy.contains('ReadOnlyMany').should('exist');
        });
        attachExistingStorageModal.findStandardPathInput().fill(roxMountPath);
        attachExistingStorageModal.findAttachButton().click();
      });

      cy.step('Verify storages are attached to workbench');
      createSpawnerPage
        .getStorageTable()
        .find()
        .within(() => {
          // Verify RWO storage exists with ReadWriteOnce
          cy.contains('tr', storageRWO).within(() => {
            cy.contains('ReadWriteOnce').should('exist');
          });

          // Verify RWX storage exists with ReadWriteMany
          cy.contains('tr', storageRWX).within(() => {
            cy.contains('ReadWriteMany').should('exist');
          });

          // Verify ROX storage exists with ReadOnlyMany
          cy.contains('tr', storageROX).within(() => {
            cy.contains('ReadOnlyMany').should('exist');
          });
        });
    },
  );

  it(
    'Create new storage with different access modes during workbench creation',
    { tags: ['@Storage', '@Dashboard', '@Workbenches'] },
    () => {
      const workbenchName = 'wb-inline-storage';
      const rwoStorageName = 'rwo-inline-storage';
      const rwxStorageName = 'rwx-inline-storage';
      const roxStorageName = 'rox-inline-storage';

      const rwoMountPath = 'rwo-mount-path';
      const roxMountPath = 'rox-mount-path';
      const rwxMountPath = 'rwx-mount-path';

      const scMultiAccessName = 'sc-multi-inline';
      const scMultiAccess: SCAccessMode = {
        ReadWriteOnce: true,
        ReadWriteMany: true,
        ReadOnlyMany: true,
      };
      provisionStorageClass(scMultiAccessName, StorageProvisioner.AZURE_FILE, scMultiAccess);
      createdStorageClasses.push(scMultiAccessName);

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
        createSpawnerPage
          .getStorageTable()
          .find()
          .within(() => {
            // Verify RWO storage exists with ReadWriteOnce
            cy.contains('tr', rwoStorageName).within(() => {
              cy.contains('ReadWriteOnce').should('exist');
            });

            // Verify RWX storage exists with ReadWriteMany
            cy.contains('tr', rwxStorageName).within(() => {
              cy.contains('ReadWriteMany').should('exist');
            });

            // Verify ROX storage exists with ReadOnlyMany
            cy.contains('tr', roxStorageName).within(() => {
              cy.contains('ReadOnlyMany').should('exist');
            });
          });
      });
    },
  );
});
