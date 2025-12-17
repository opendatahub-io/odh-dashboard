import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import {
  provisionDualAccessStorageClass,
  provisionMultiAccessStorageClass,
  tearDownStorageClassFeature,
  provisionClusterStorageSCFeature,
  tearDownClusterStorageSCFeature,
} from '../../../../utils/storageClass';
import {
  workbenchPage,
  createSpawnerPage,
  attachExistingStorageModal,
  storageModal,
} from '../../../../pages/workbench';
import { clusterStorage, addClusterStorageModal } from '../../../../pages/clusterStorage';
import { projectDetails, projectListPage } from '../../../../pages/projects';
import { retryableBefore } from '../../../../utils/retryableHooks';
import type { WBStorageClassesTestData } from '../../../../types';
import { selectNotebookImageWithBackendFallback } from '../../../../utils/oc_commands/imageStreams';
import { loadWBStorageClassesFixture } from '../../../../utils/dataLoader';
import { generateTestUUID } from '../../../../utils/uuidGenerator';

describe('Workbench Storage Classes Tests', () => {
  const createdStorageClasses: string[] = [];
  let projectName: string;
  const uuid = generateTestUUID();

  // Storage class names
  let storageClassRWO: string;
  let storageClassMultiAccess: string;

  // Workbench names
  let workbenchNameRWO: string;
  let workbenchNameMultiA: string;
  let workbenchNameMultiB: string;

  // Storage names - Test 1 (RWO only)
  let storageNameRWO: string;

  // Storage names - Test 2 (attach existing with different access modes)
  let storageAttachRWO: string;
  let storageAttachRWX: string;
  let storageAttachROX: string;

  // Storage names - Test 3 (create new with different access modes)
  let storageCreateRWO: string;
  let storageCreateRWX: string;
  let storageCreateROX: string;

  // Mount paths
  let mountPathA: string;
  let mountPathB: string;
  let mountPathC: string;

  const rwoLabel = 'ReadWriteOnce';
  const rwxLabel = 'ReadWriteMany';
  const roxLabel = 'ReadOnlyMany';

  retryableBefore(() => {
    // Load test data from fixtures
    return loadWBStorageClassesFixture('e2e/dataScienceProjects/testWorkbenchStorageClasses.yaml')
      .then((fixtureData: WBStorageClassesTestData) => {
        cy.log('Loaded test data from fixtures');
        projectName = `${fixtureData.projectName}-${uuid}`;
        storageClassRWO = fixtureData.storageClassRWO;
        storageClassMultiAccess = fixtureData.storageClassMultiAccess;
        workbenchNameRWO = fixtureData.workbenchRWO;
        workbenchNameMultiA = fixtureData.workbenchMultiAccessA;
        workbenchNameMultiB = fixtureData.workbenchMultiAccessB;
        storageNameRWO = fixtureData.storageRWO;
        storageAttachRWO = `${fixtureData.storageMultiAccess}-rwo`;
        storageAttachRWX = `${fixtureData.storageMultiAccess}-rwx`;
        storageAttachROX = `${fixtureData.storageMultiAccess}-rox`;
        storageCreateRWO = `${fixtureData.storageMultiAccess}-b-rwo`;
        storageCreateRWX = `${fixtureData.storageMultiAccess}-b-rwx`;
        storageCreateROX = `${fixtureData.storageMultiAccess}-b-rox`;
        mountPathA = fixtureData.mountPathA;
        mountPathB = fixtureData.mountPathB;
        mountPathC = fixtureData.mountPathC;
      })
      .then(() => {
        cy.step('Provisioning storage class');
        provisionDualAccessStorageClass(storageClassRWO);
        provisionMultiAccessStorageClass(storageClassMultiAccess);
        // Only add if not already in the array (prevent duplicates on retry)
        if (!createdStorageClasses.includes(storageClassRWO)) {
          createdStorageClasses.push(storageClassRWO);
        }
        if (!createdStorageClasses.includes(storageClassMultiAccess)) {
          createdStorageClasses.push(storageClassMultiAccess);
        }

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
  });

  it(
    'Create workbench with RWO storage and verify storage attachment',
    {
      tags: ['@Smoke', '@SmokeSet1', '@Storage', '@ODS-1931', '@Dashboard', '@Workbenches'],
    },
    () => {
      let selectedImageStream: string;

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

      selectNotebookImageWithBackendFallback('code-server-notebook', createSpawnerPage).then(
        (imageStreamName: string) => {
          selectedImageStream = imageStreamName;
          cy.log(`Selected imagestream: ${selectedImageStream}`);
          cy.step('Attach RWO storage to workbench');
          createSpawnerPage.findAttachExistingStorageButton().click();
          attachExistingStorageModal.findStandardPathInput().fill(mountPathA);
          attachExistingStorageModal.findAttachButton().click();
          createSpawnerPage.findSubmitButton().click();

          cy.step('Verify workbench is running with attached RWO storage');
          const notebookRow = workbenchPage.getNotebookRow(workbenchNameRWO);

          cy.step('Verify RWO storage details in workbench edit view');
          notebookRow.findKebab().click();
          notebookRow.findKebabAction('Edit workbench').click();

          cy.step('Verify storage access mode in table');
          const storageTable = createSpawnerPage.getStorageTable();
          storageTable.verifyStorageAccessMode(storageNameRWO, 'ReadWriteOnce');

          createSpawnerPage.findSubmitButton().click();
        },
      );
    },
  );

  it(
    'Display access mode information when selecting storage to attach to workbench',
    {
      tags: ['@Smoke', '@SmokeSet1', '@Storage', '@Dashboard', '@Workbenches', '@NonConcurrent'],
    },
    () => {
      cy.step('Create storages with different access modes');
      projectDetails.findSectionTab('cluster-storages').click();

      // RWO storage
      clusterStorage.findAddClusterStorageButton().click();
      addClusterStorageModal.findNameInput().type(storageAttachRWO);
      let storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(storageClassMultiAccess, 'i'));
      addClusterStorageModal.findRWOAccessMode().click();
      addClusterStorageModal.findSubmitButton().click();
      clusterStorage.getClusterStorageRow(storageAttachRWO).find().should('exist');

      // RWX storage
      clusterStorage.findAddClusterStorageButton().click();
      addClusterStorageModal.findNameInput().type(storageAttachRWX);
      storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(storageClassMultiAccess, 'i'));
      addClusterStorageModal.findRWXAccessMode().click();
      addClusterStorageModal.findSubmitButton().click();
      clusterStorage.getClusterStorageRow(storageAttachRWX).find().should('exist');

      // ROX storage
      clusterStorage.findAddClusterStorageButton().click();
      addClusterStorageModal.findNameInput().type(storageAttachROX);
      storageClassSelect = addClusterStorageModal.findStorageClassSelect();
      storageClassSelect.find().click();
      storageClassSelect.selectStorageClassSelectOption(new RegExp(storageClassMultiAccess, 'i'));
      addClusterStorageModal.findROXAccessMode().click();
      addClusterStorageModal.findSubmitButton().click();
      clusterStorage.getClusterStorageRow(storageAttachROX).find().should('exist');

      cy.step('Open workbench creation form');
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().fill(workbenchNameMultiA);

      selectNotebookImageWithBackendFallback('code-server-notebook', createSpawnerPage).then(() => {
        cy.step('Open attach storage modal');
        createSpawnerPage.findAttachExistingStorageButton().click();

        cy.step(`Select RWO storage and verify ${rwoLabel} is displayed`);
        attachExistingStorageModal.selectExistingPersistentStorage(storageAttachRWO);
        attachExistingStorageModal.find().within(() => {
          cy.contains(rwoLabel).should('exist');
        });
        attachExistingStorageModal.findStandardPathInput().fill(mountPathA);
        attachExistingStorageModal.findAttachButton().click();

        cy.step(`Select RWX storage and verify ${rwxLabel} is displayed`);
        createSpawnerPage.findAttachExistingStorageButton().click();
        attachExistingStorageModal.selectExistingPersistentStorage(storageAttachRWX);
        attachExistingStorageModal.find().within(() => {
          cy.contains(rwxLabel).should('exist');
        });
        attachExistingStorageModal.findStandardPathInput().fill(mountPathB);
        attachExistingStorageModal.findAttachButton().click();

        cy.step(`Select ROX storage and verify ${roxLabel} is displayed`);
        createSpawnerPage.findAttachExistingStorageButton().click();
        attachExistingStorageModal.selectExistingPersistentStorage(storageAttachROX);
        attachExistingStorageModal.find().within(() => {
          cy.contains(roxLabel).should('exist');
        });
        attachExistingStorageModal.findStandardPathInput().fill(mountPathC);
        attachExistingStorageModal.findAttachButton().click();
      });

      cy.step('Verify storages are attached to workbench');
      const storageTable = createSpawnerPage.getStorageTable();
      storageTable.verifyStorageAccessMode(storageAttachRWO, rwoLabel);
      storageTable.verifyStorageAccessMode(storageAttachRWX, rwxLabel);
      storageTable.verifyStorageAccessMode(storageAttachROX, roxLabel);
    },
  );

  it(
    'Create new storage with different access modes during workbench creation',
    {
      tags: ['@Smoke', '@SmokeSet1', '@Storage', '@Dashboard', '@Workbenches', '@NonConcurrent'],
    },
    () => {
      cy.step('Open workbench creation form');
      projectDetails.findSectionTab('workbenches').click();
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().fill(workbenchNameMultiB);

      selectNotebookImageWithBackendFallback('code-server-notebook', createSpawnerPage).then(() => {
        cy.step('Create new storage with RWO access mode');
        createSpawnerPage.findCreateStorageButton().click();
        storageModal.findNameInput().type(storageCreateRWO);
        let storageClassSelect = storageModal.findStorageClassSelect();
        storageClassSelect.find().click();
        storageClassSelect.selectStorageClassSelectOption(new RegExp(storageClassMultiAccess, 'i'));
        storageModal.findRWOAccessMode().click();
        storageModal.findMountField().fill(mountPathA);
        storageModal.findSubmitButton().click();

        cy.step('Create new storage with RWX access mode');
        createSpawnerPage.findCreateStorageButton().click();
        storageModal.findNameInput().type(storageCreateRWX);
        storageClassSelect = storageModal.findStorageClassSelect();
        storageClassSelect.find().click();
        storageClassSelect.selectStorageClassSelectOption(new RegExp(storageClassMultiAccess, 'i'));
        storageModal.findRWXAccessMode().click();
        storageModal.findMountField().fill(mountPathB);
        storageModal.findSubmitButton().click();

        cy.step('Create new storage with ROX access mode');
        createSpawnerPage.findCreateStorageButton().click();
        storageModal.findNameInput().type(storageCreateROX);
        storageClassSelect = storageModal.findStorageClassSelect();
        storageClassSelect.find().click();
        storageClassSelect.selectStorageClassSelectOption(new RegExp(storageClassMultiAccess, 'i'));
        storageModal.findROXAccessMode().click();
        storageModal.findMountField().fill(mountPathC);
        storageModal.findSubmitButton().click();

        cy.step('Verify storages are created with the correct access modes');
        const storageTable = createSpawnerPage.getStorageTable();
        storageTable.verifyStorageAccessMode(storageCreateRWO, rwoLabel);
        storageTable.verifyStorageAccessMode(storageCreateRWX, rwxLabel);
        storageTable.verifyStorageAccessMode(storageCreateROX, roxLabel);
      });
    },
  );
});
