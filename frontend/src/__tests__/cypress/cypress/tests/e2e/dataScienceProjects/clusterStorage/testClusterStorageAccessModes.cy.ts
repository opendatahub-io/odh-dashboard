import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  provisionStorageClassesForAccessModeTests,
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
import type { ClusterStorageAccessModesTestData } from '#~/__tests__/cypress/cypress/types';
import { findAddClusterStorageButton } from '#~/__tests__/cypress/cypress/utils/clusterStorage';
import { loadClusterStorageAccessModesFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';

describe('Cluster Storage Access Modes Tests', () => {
  let testData: ClusterStorageAccessModesTestData;
  const createdStorageClasses: string[] = [];

  retryableBefore(() => {
    // Load test data from fixtures
    return loadClusterStorageAccessModesFixture(
      'e2e/dataScienceProjects/testClusterStorageAccessModes.yaml',
    )
      .then((fixtureData: ClusterStorageAccessModesTestData) => {
        testData = fixtureData;
        cy.log('Loaded test data from fixtures');
      })
      .then(() => {
        cy.step('Provisioning storage classes with different access modes');
        const provisionedStorageClasses = provisionStorageClassesForAccessModeTests({
          storageClassRWO: testData.storageClassRWO,
          storageClassRWX: testData.storageClassRWX,
          storageClassROX: testData.storageClassROX,
          storageClassRWOP: testData.storageClassRWOP,
          storageClassMultiAccess: testData.storageClassMultiAccess,
        });
        createdStorageClasses.push(...provisionedStorageClasses);

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

    cy.step('Navigate to the Cluster Storage tab');
    projectDetails.findSectionTab('cluster-storages').click();
  });

  it(
    'Should display storage classes with different access modes in cluster storage dropdown',
    { tags: ['@Smoke', '@SmokeSet2', '@Dashboard', '@NonConcurrent'] },
    () => {
      cy.step('Open the Create cluster storage modal');
      findAddClusterStorageButton().click();

      cy.step('Verify storage class dropdown is enabled and contains our storage classes');
      const storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      storageClassSelect.find().should('not.be.disabled');

      cy.step('Click on the storage class dropdown to open it');
      storageClassSelect.find().click();

      cy.step('Verify storage classes with different access modes are available');
      storageClassSelect.selectStorageClassSelectOption(new RegExp(testData.storageClassRWO, 'i'));
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(testData.storageClassRWX, 'i'));
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(testData.storageClassROX, 'i'));
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(testData.storageClassRWOP, 'i'));
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(
        new RegExp(testData.storageClassMultiAccess, 'i'),
      );
      addClusterStorageModal.findCloseButton().click({ force: true });
    },
  );

  it(
    'Should show correct access modes when selecting storage classes with single access mode',
    { tags: ['@Smoke', '@SmokeSet2', '@Dashboard', '@NonConcurrent'] },
    () => {
      cy.step('Open the Create cluster storage modal');
      findAddClusterStorageButton().click();
      // Wait for modal to be fully visible
      addClusterStorageModal.find().should('be.visible');

      cy.step(`Select storage class with ReadWriteOnce access mode: ${testData.storageClassRWO}`);
      const storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      // Ensure dropdown button is ready before clicking
      storageClassSelect.find().should('be.visible').should('be.enabled');
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(testData.storageClassRWO, 'i'));
      // Wait for dropdown to show the selected value (proves selection completed)
      storageClassSelect.find().should('contain.text', testData.storageClassRWO);

      cy.step('Verify ReadWriteOnce access mode is available and selected');
      addClusterStorageModal.findRWOAccessMode().should('exist').should('be.checked');
      cy.step('Verify other access modes are not available for RWO-only storage class');
      addClusterStorageModal.findRWXAccessMode().should('not.exist');
      addClusterStorageModal.findROXAccessMode().should('not.exist');
      addClusterStorageModal.findRWOPAccessMode().should('not.exist');

      cy.step('Verify that correct access modes are shown and selected for other storage classes');
      cy.step(`Select storage class with ReadWriteMany access mode: ${testData.storageClassRWX}`);
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(testData.storageClassRWX, 'i'));
      // Wait for dropdown to show the selected value (proves selection completed)
      storageClassSelect.find().should('contain.text', testData.storageClassRWX);

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
      findAddClusterStorageButton().click();

      cy.step(
        `Select storage class with multiple access modes: ${testData.storageClassMultiAccess}`,
      );
      const storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(
        new RegExp(testData.storageClassMultiAccess, 'i'),
      );
      // Wait for dropdown to show the selected value (proves selection completed)
      storageClassSelect.find().should('contain.text', testData.storageClassMultiAccess);

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
      findAddClusterStorageButton().click();

      const storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(testData.storageClassRWX, 'i'));
      // Wait for dropdown to show the selected value (proves selection completed)
      storageClassSelect.find().should('contain.text', testData.storageClassRWX);
      addClusterStorageModal.findRWXAccessMode().click();
      const storageName = testData.storageRWX;
      addClusterStorageModal.findNameInput().type(storageName);
      addClusterStorageModal.findDescriptionInput().type(testData.storageDescription);

      cy.step('Submit the form');
      addClusterStorageModal.findSubmitButton().should('not.be.disabled').click();

      cy.step('Verify cluster storage was created successfully');
      clusterStorage.getClusterStorageRow(storageName).find().should('exist');

      const storageRow = clusterStorage.getClusterStorageRow(storageName);
      storageRow.findStorageClassColumn().should('contain.text', testData.storageClassRWX);

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
      findAddClusterStorageButton().click();

      const storageClassSelect = addClusterStorageModal.findStorageClassSelect();

      cy.step('Select multi-access storage class and choose RWX');
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(
        new RegExp(testData.storageClassMultiAccess, 'i'),
      );
      // Wait for dropdown to show the selected value (proves selection completed)
      storageClassSelect.find().should('contain.text', testData.storageClassMultiAccess);
      addClusterStorageModal.findRWXAccessMode().click();
      addClusterStorageModal.findRWXAccessMode().should('be.checked');

      cy.step('Switch to RWO-only storage class');
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(testData.storageClassRWO, 'i'));
      // Wait for dropdown to show the selected value (proves selection completed)
      storageClassSelect.find().should('contain.text', testData.storageClassRWO);

      cy.step('Verify access mode defaults to RWO (the only available option)');
      addClusterStorageModal.findRWOAccessMode().should('exist').should('be.checked');
      addClusterStorageModal.findRWXAccessMode().should('not.exist');

      addClusterStorageModal.findCloseButton().click({ force: true });
    },
  );
});
