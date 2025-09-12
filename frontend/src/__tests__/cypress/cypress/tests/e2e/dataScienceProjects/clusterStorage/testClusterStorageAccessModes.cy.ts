import { StorageProvisioner } from '@odh-dashboard/internal/pages/storageClasses/storageEnums';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  provisionStorageClass,
  tearDownStorageClassFeature,
  provisionClusterStorageSCFeature,
  tearDownClusterStorageSCFeature,
} from '#~/__tests__/cypress/cypress/utils/storageClass';
import {
  clusterStorage,
  addClusterStorageModal,
  updateClusterStorageModal,
} from '#~/__tests__/cypress/cypress/pages/clusterStorage';
import { projectDetails, projectListPage } from '#~/__tests__/cypress/cypress/pages/projects';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import type { SCAccessMode } from '#~/__tests__/cypress/cypress/types';

describe('[Automation Bug: RHOAIENG-33410] Cluster Storage Access Modes Tests', () => {
  const createdStorageClasses: string[] = [];

  const projectName = 'test-cluster-storage-access-modes-preset';
  const scRWOName = 'sc-rwo-preset';
  const scRWXName = 'sc-rwx-preset';
  const scROXName = 'sc-rox-preset';
  const scRWOPName = 'sc-rwop-preset';
  const scMultiAccessName = 'sc-multi-access-preset';

  retryableBefore(() => {
    cy.step('Provisioning storage classes with different access modes');

    const scRWO: SCAccessMode = {
      ReadWriteOnce: true,
      ReadWriteMany: false,
    };
    provisionStorageClass(scRWOName, StorageProvisioner.VSPHERE_VOLUME, scRWO);
    createdStorageClasses.push(scRWOName);

    const scRWX: SCAccessMode = {
      ReadWriteOnce: false,
      ReadWriteMany: true,
    };
    provisionStorageClass(scRWXName, StorageProvisioner.BLOCK_CSI_IBM, scRWX);
    createdStorageClasses.push(scRWXName);

    const scROX: SCAccessMode = {
      ReadWriteOnce: false,
      ReadWriteMany: false,
      ReadOnlyMany: true,
    };
    provisionStorageClass(scROXName, StorageProvisioner.QUOBYTE, scROX);
    createdStorageClasses.push(scROXName);

    const scRWOP: SCAccessMode = {
      ReadOnlyMany: false,
      ReadWriteOncePod: true,
    };
    provisionStorageClass(scRWOPName, StorageProvisioner.PD_CSI_GKE, scRWOP);
    createdStorageClasses.push(scRWOPName);

    const scMultiAccess: SCAccessMode = {
      ReadWriteOnce: true,
      ReadWriteMany: true,
      ReadOnlyMany: true,
      ReadWriteOncePod: false,
    };
    provisionStorageClass(scMultiAccessName, StorageProvisioner.AZURE_FILE, scMultiAccess);
    createdStorageClasses.push(scMultiAccessName);

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

    cy.step('Navigate to the Cluster Storage tab');
    projectDetails.findSectionTab('cluster-storages').click();
  });

  it(
    'Should display storage classes with different access modes in cluster storage dropdown',
    { tags: ['@Smoke', '@SmokeSet2', '@Dashboard', '@NonConcurrent', '@Maintain'] },
    () => {
      cy.step('Open the Create cluster storage modal');
      clusterStorage.findCreateButton().click();

      cy.step('Verify storage class dropdown is enabled and contains our storage classes');
      const storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      storageClassSelect.find().should('not.be.disabled');

      cy.step('Click on the storage class dropdown to open it');
      storageClassSelect.find().click();

      cy.step('Verify storage classes with different access modes are available');
      storageClassSelect.selectStorageClassSelectOption(new RegExp(scRWOName, 'i'));
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(scRWXName, 'i'));
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(scROXName, 'i'));
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(scRWOPName, 'i'));
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(scMultiAccessName, 'i'));
      addClusterStorageModal.findCloseButton().click({ force: true });
    },
  );

  it(
    'Should show correct access modes when selecting storage classes with RWO access mode',
    { tags: ['@Smoke', '@SmokeSet2', '@Dashboard', '@NonConcurrent', '@Maintain'] },
    () => {
      cy.step('Open the Create cluster storage modal');
      clusterStorage.findCreateButton().click();

      cy.step(`Select storage class with ReadWriteOnce access mode: ${scRWOName}`);
      const storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(scRWOName, 'i'));

      cy.step('Verify ReadWriteOnce access mode is available and selected');
      addClusterStorageModal.findRWOAccessMode().should('exist').should('be.checked');
      cy.step('Verify other access modes are not available for RWO-only storage class');
      addClusterStorageModal.findRWXAccessMode().should('exist').should('be.disabled');
      cy.step('Verify other access modes are not available for RWX-only storage class');
      addClusterStorageModal.findROXAccessMode().should('not.exist');
      addClusterStorageModal.findRWOPAccessMode().should('not.exist');

      cy.step('Verify that correct access modes are shown and selected for other storage classes');
      cy.step(`Select storage class with ReadWriteMany access mode: ${scRWOName}`);
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(scRWXName, 'i'));

      cy.step('Verify ReadWriteMany access mode is available');
      addClusterStorageModal.findRWXAccessMode().should('exist').should('not.be.disabled');
      addClusterStorageModal.findRWXAccessMode().click();
      addClusterStorageModal.findRWXAccessMode().should('be.checked');
      // RWO access mode is never disabled
      addClusterStorageModal.findRWOAccessMode().should('exist').should('not.be.disabled');

      cy.step('Verify other access modes are not available for RWX-only storage class');
      addClusterStorageModal.findROXAccessMode().should('not.exist');
      addClusterStorageModal.findRWOPAccessMode().should('not.exist');
      addClusterStorageModal.findCloseButton().click({ force: true });
    },
  );

  it(
    'Should show multiple access modes when selecting storage class with multiple access modes',
    { tags: ['@Smoke', '@SmokeSet2', '@Dashboard', '@NonConcurrent', '@Maintain'] },
    () => {
      cy.step('Open the Create cluster storage modal');
      clusterStorage.findCreateButton().click();

      cy.step(`Select storage class with multiple access modes: ${scMultiAccessName}`);
      const storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(scMultiAccessName, 'i'));

      cy.step('Verify multiple access modes are available and can be selected');
      addClusterStorageModal.findRWOAccessMode().should('exist').should('not.be.disabled');
      addClusterStorageModal.findRWXAccessMode().should('exist').should('not.be.disabled');
      addClusterStorageModal.findROXAccessMode().should('exist').should('not.be.disabled');

      // RWOP should be disabled since it wasn't included in this storage class
      addClusterStorageModal.findRWOPAccessMode().should('exist').should('be.disabled');

      cy.step('Test switching between available access modes');

      cy.step('Default should be RWO');
      addClusterStorageModal.findRWOAccessMode().should('be.checked');

      cy.step('Switch to RWX');
      addClusterStorageModal.findRWXAccessMode().click();
      addClusterStorageModal.findRWXAccessMode().should('be.checked');
      addClusterStorageModal.findRWOAccessMode().should('not.be.checked');

      cy.step('Switch ROX');
      addClusterStorageModal.findROXAccessMode().click();
      addClusterStorageModal.findROXAccessMode().should('be.checked');
      addClusterStorageModal.findRWXAccessMode().should('not.be.checked');
      addClusterStorageModal.findCloseButton().click({ force: true });
    },
  );

  it(
    'Should successfully create cluster storage with different access modes, and not be allowed to change access modes on edit',
    { tags: ['@Smoke', '@SmokeSet2', '@Dashboard', '@NonConcurrent', '@Maintain'] },
    () => {
      cy.step('Fill in the create cluster storage with ReadWriteMany access mode');
      clusterStorage.findCreateButton().click();

      const storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(scRWXName, 'i'));
      addClusterStorageModal.findRWXAccessMode().click();
      const storageName = 'test-rwx-storage-preset';
      addClusterStorageModal.findNameInput().type(storageName);
      addClusterStorageModal
        .findDescriptionInput()
        .type('Test storage with ReadWriteMany access mode');

      cy.step('Submit the form');
      addClusterStorageModal.findSubmitButton().should('not.be.disabled').click();

      cy.step('Verify cluster storage was created successfully');
      clusterStorage.getClusterStorageRow(storageName).find().should('exist');

      const storageRow = clusterStorage.getClusterStorageRow(storageName);
      storageRow.findStorageClassColumn().should('contain.text', scRWXName);

      cy.step('Attempt to edit the cluster storage');
      clusterStorage.getClusterStorageRow(storageName).findKebabAction('Edit storage').click();

      cy.step('Verify edit modal opens with correct title');
      updateClusterStorageModal.find().should('be.visible');

      cy.step('Verify access mode is displayed in read-only format like "ReadWriteMany (RWX)"');
      updateClusterStorageModal.findExistingAccessMode().should('exist');
      updateClusterStorageModal.findExistingAccessMode().should('contain.text', 'ReadWriteMany');
      updateClusterStorageModal.findExistingAccessMode().should('contain.text', 'RWX');

      cy.step('Verify that access mode radio buttons are not available for editing');
      updateClusterStorageModal.findRWOAccessMode().should('not.exist');
      updateClusterStorageModal.findRWXAccessMode().should('not.exist');
      updateClusterStorageModal.findROXAccessMode().should('not.exist');
      updateClusterStorageModal.findRWOPAccessMode().should('not.exist');
      updateClusterStorageModal.findCloseButton().click({ force: true });
    },
  );
});
