import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import {
  provisionStorageClassesForAccessModeTests,
  tearDownStorageClassFeature,
  provisionClusterStorageSCFeature,
  tearDownClusterStorageSCFeature,
} from '../../../../utils/storageClass';
import {
  clusterStorage,
  addClusterStorageModal,
  updateClusterStorageModal,
} from '../../../../pages/clusterStorage';
import type { ClusterStorageAccessModesTestData } from '../../../../types';
import { loadClusterStorageAccessModesFixture } from '../../../../utils/dataLoader';
import { projectDetails, projectListPage } from '../../../../pages/projects';
import { retryableBefore } from '../../../../utils/retryableHooks';

describe('Cluster Storage Access Modes Tests', () => {
  const createdStorageClasses: string[] = [];

  // Project name
  let projectName: string;

  // Storage class names
  let storageClassRWO: string;
  let storageClassRWX: string;
  let storageClassROX: string;
  let storageClassRWOP: string;
  let storageClassMultiAccess: string;

  // Storage name and description
  let storageName: string;
  let storageDescription: string;

  retryableBefore(() => {
    // Load test data from fixtures
    return loadClusterStorageAccessModesFixture(
      'e2e/dataScienceProjects/testClusterStorageAccessModes.yaml',
    )
      .then((fixtureData: ClusterStorageAccessModesTestData) => {
        cy.log('Loaded test data from fixtures');

        projectName = fixtureData.projectName;
        storageClassRWO = fixtureData.storageClassRWO;
        storageClassRWX = fixtureData.storageClassRWX;
        storageClassROX = fixtureData.storageClassROX;
        storageClassRWOP = fixtureData.storageClassRWOP;
        storageClassMultiAccess = fixtureData.storageClassMultiAccess;
        storageName = fixtureData.storageName;
        storageDescription = fixtureData.storageDescription;
      })
      .then(() => {
        cy.step('Provisioning storage classes with different access modes');
        const provisionedStorageClasses = provisionStorageClassesForAccessModeTests({
          storageClassRWO,
          storageClassRWX,
          storageClassROX,
          storageClassRWOP,
          storageClassMultiAccess,
        });
        createdStorageClasses.push(...provisionedStorageClasses);

        cy.step('Provisioning project');
        provisionClusterStorageSCFeature(projectName, HTPASSWD_CLUSTER_ADMIN_USER.USERNAME);
      });
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
    { tags: ['@Smoke', '@SmokeSet2', '@Dashboard', '@NonConcurrent'] },
    () => {
      cy.step('Open the Create cluster storage modal');
      clusterStorage.findAddClusterStorageButton().click();

      cy.step('Verify storage class dropdown is enabled and contains our storage classes');
      const storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      storageClassSelect.find().should('not.be.disabled');

      cy.step('Click on the storage class dropdown to open it');
      storageClassSelect.find().click();

      cy.step('Verify storage classes with different access modes are available');
      storageClassSelect.selectStorageClassSelectOption(new RegExp(storageClassRWO, 'i'));
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(storageClassRWX, 'i'));
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(storageClassROX, 'i'));
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(storageClassRWOP, 'i'));
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(storageClassMultiAccess, 'i'));
      addClusterStorageModal.findCloseButton().click({ force: true });
    },
  );

  it(
    'Should show correct access modes when selecting storage classes with single access mode',
    { tags: ['@Smoke', '@SmokeSet2', '@Dashboard', '@NonConcurrent'] },
    () => {
      cy.step('Open the Create cluster storage modal');
      clusterStorage.findAddClusterStorageButton().click();
      // Wait for modal to be fully visible
      addClusterStorageModal.find().should('be.visible');

      cy.step(`Select storage class with ReadWriteOnce access mode: ${storageClassRWO}`);
      const storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      // Ensure dropdown button is ready before clicking
      storageClassSelect.find().should('be.visible').should('be.enabled');
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(storageClassRWO, 'i'));
      // Wait for dropdown to show the selected value (proves selection completed)
      storageClassSelect.find().should('contain.text', storageClassRWO);

      cy.step('Verify ReadWriteOnce access mode is available and selected');
      addClusterStorageModal.findRWOAccessMode().should('exist').should('be.checked');
      cy.step('Verify other access modes are not available for RWO-only storage class');
      addClusterStorageModal.findRWXAccessMode().should('not.exist');
      addClusterStorageModal.findROXAccessMode().should('not.exist');
      addClusterStorageModal.findRWOPAccessMode().should('not.exist');

      cy.step('Verify that correct access modes are shown and selected for other storage classes');
      cy.step(`Select storage class with ReadWriteMany access mode: ${storageClassRWX}`);
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(storageClassRWX, 'i'));
      // Wait for dropdown to show the selected value (proves selection completed)
      storageClassSelect.find().should('contain.text', storageClassRWX);

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
    'Should show correct access modes when selecting storage class with multiple access modes',
    { tags: ['@Smoke', '@SmokeSet2', '@Dashboard', '@NonConcurrent'] },
    () => {
      cy.step('Open the Create cluster storage modal');
      clusterStorage.findAddClusterStorageButton().click();

      cy.step(`Select storage class with multiple access modes: ${storageClassMultiAccess}`);
      const storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(storageClassMultiAccess, 'i'));
      // Wait for dropdown to show the selected value (proves selection completed)
      storageClassSelect.find().should('contain.text', storageClassMultiAccess);

      cy.step('Verify multiple access modes are available and can be selected');
      addClusterStorageModal.findRWOAccessMode().should('exist').should('not.be.disabled');
      addClusterStorageModal.findRWXAccessMode().should('exist').should('not.be.disabled');
      addClusterStorageModal.findROXAccessMode().should('exist').should('not.be.disabled');

      // RWOP should not exist since it wasn't included in this storage class
      addClusterStorageModal.findRWOPAccessMode().should('not.exist');

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
    { tags: ['@Smoke', '@SmokeSet2', '@Dashboard', '@NonConcurrent'] },
    () => {
      cy.step('Fill in the create cluster storage with ReadWriteMany access mode');
      clusterStorage.findAddClusterStorageButton().click();

      const storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(storageClassRWX, 'i'));
      // Wait for dropdown to show the selected value (proves selection completed)
      storageClassSelect.find().should('contain.text', storageClassRWX);
      addClusterStorageModal.findRWXAccessMode().click();
      addClusterStorageModal.findNameInput().type(storageName);
      addClusterStorageModal.findDescriptionInput().type(storageDescription);

      cy.step('Submit the form');
      addClusterStorageModal.findSubmitButton().should('not.be.disabled').click();

      cy.step('Verify cluster storage was created successfully');
      clusterStorage.getClusterStorageRow(storageName).find().should('exist');

      const storageRow = clusterStorage.getClusterStorageRow(storageName);
      storageRow.findStorageClassColumn().should('contain.text', storageClassRWX);

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

  it(
    'Should reset access mode appropriately when switching between storage classes',
    { tags: ['@Smoke', '@SmokeSet2', '@Dashboard', '@NonConcurrent'] },
    () => {
      cy.step('Open create modal');
      clusterStorage.findAddClusterStorageButton().click();

      const storageClassSelect = addClusterStorageModal.findStorageClassSelect();

      cy.step('Select multi-access storage class and choose RWX');
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(storageClassMultiAccess, 'i'));
      // Wait for dropdown to show the selected value (proves selection completed)
      storageClassSelect.find().should('contain.text', storageClassMultiAccess);
      addClusterStorageModal.findRWXAccessMode().click();
      addClusterStorageModal.findRWXAccessMode().should('be.checked');

      cy.step('Switch to RWO-only storage class');
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(storageClassRWO, 'i'));
      // Wait for dropdown to show the selected value (proves selection completed)
      storageClassSelect.find().should('contain.text', storageClassRWO);

      cy.step('Verify access mode defaults to RWO (the only available option)');
      addClusterStorageModal.findRWOAccessMode().should('exist').should('be.checked');
      addClusterStorageModal.findRWXAccessMode().should('not.exist');

      addClusterStorageModal.findCloseButton().click({ force: true });
    },
  );
});
