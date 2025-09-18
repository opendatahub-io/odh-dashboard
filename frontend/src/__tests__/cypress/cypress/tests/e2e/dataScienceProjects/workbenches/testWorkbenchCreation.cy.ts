import type { WBEditTestData, AWSS3BucketDetails } from '#~/__tests__/cypress/cypress/types';
import { projectDetails, projectListPage } from '#~/__tests__/cypress/cypress/pages/projects';
import {
  workbenchPage,
  createSpawnerPage,
  notebookConfirmModal,
} from '#~/__tests__/cypress/cypress/pages/workbench';
import {
  HTPASSWD_CLUSTER_ADMIN_USER,
  LDAP_CONTRIBUTOR_USER,
} from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { loadPVCEditFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { createCleanProject } from '#~/__tests__/cypress/cypress/utils/projectChecker';
import {
  deleteOpenShiftProject,
  addUserToProject,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import {
  addConnectionModal,
  connectionsPage,
} from '#~/__tests__/cypress/cypress/pages/connections';
import { deleteModal } from '#~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { AWS_BUCKETS } from '#~/__tests__/cypress/cypress/utils/s3Buckets';
import { clusterStorage } from '#~/__tests__/cypress/cypress/pages/clusterStorage';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';
import {
  selectNotebookImageWithBackendFallback,
  getImageStreamDisplayName,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/imageStreams';

describe('[Product Bug: RHOAIENG-31579] Create, Delete and Edit - Workbench Tests', () => {
  let editTestNamespace: string;
  let editedTestNamespace: string;
  let editedTestDescription: string;
  let pvcEditDisplayName: string;
  let pvcStorageName: string;
  let contributor: string;
  let s3Config: AWSS3BucketDetails;
  let s3AccessKey: string;
  let s3SecretKey: string;
  const uuid = generateTestUUID();

  // Setup: Load test data and ensure clean state
  retryableBefore(() =>
    loadPVCEditFixture('e2e/dataScienceProjects/testWorkbenchEditing.yaml')
      .then((fixtureData: WBEditTestData) => {
        editTestNamespace = `${fixtureData.editTestNamespace}-${uuid}`;
        editedTestNamespace = fixtureData.editedTestNamespace;
        editedTestDescription = fixtureData.editedTestDescription;
        pvcEditDisplayName = fixtureData.pvcEditDisplayName;
        contributor = LDAP_CONTRIBUTOR_USER.USERNAME;
        pvcStorageName = `${fixtureData.pvcStorageName}-${uuid}-storage`;
        const bucketKey = 'BUCKET_1' as const;
        const bucketConfig = AWS_BUCKETS[bucketKey];

        s3Config = bucketConfig;
        s3AccessKey = AWS_BUCKETS.AWS_ACCESS_KEY_ID;
        s3SecretKey = AWS_BUCKETS.AWS_SECRET_ACCESS_KEY;

        cy.log('S3 Configuration:');
        cy.log(`Bucket Name: ${s3Config.NAME}`);
        cy.log(`Bucket Region: ${s3Config.REGION}`);
        cy.log(`Bucket Endpoint: ${s3Config.ENDPOINT}`);
        cy.log(`Access Key ID: ${s3AccessKey.substring(0, 5)}...`);
        cy.log(`Secret Access Key: ${s3SecretKey.substring(0, 5)}...`);

        if (!editTestNamespace) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${editTestNamespace}`);
        return createCleanProject(editTestNamespace);
      })
      .then(() => {
        cy.log(`Project ${editTestNamespace} confirmed to be created and verified successfully`);
        addUserToProject(editTestNamespace, contributor, 'edit');
      }),
  );
  after(() => {
    // Delete provisioned Project
    if (editTestNamespace) {
      cy.log(`Deleting Project ${editTestNamespace} after the test has finished.`);
      deleteOpenShiftProject(editTestNamespace, { wait: false, ignoreNotFound: true });
    }
  });

  it(
    'Create Workbench from the launcher page and verify that it is created successfully.',
    {
      tags: [
        '@Sanity',
        '@SanitySet1',
        '@ODS-1931',
        '@ODS-2218',
        '@Dashboard',
        '@Workbenches',
        '@Bug',
      ],
    },
    () => {
      const workbenchName = editTestNamespace.replace('dsp-', '');
      let selectedImageStream: string;

      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation and select workbences
      cy.step(`Navigate to workbenches tab of Project ${editTestNamespace}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(editTestNamespace);
      projectListPage.findProjectLink(editTestNamespace).click();
      projectDetails.findSectionTab('workbenches').click();

      // Create workbench
      cy.step(`Create workbench ${editTestNamespace} using storage ${pvcEditDisplayName}`);
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().fill(workbenchName);

      // Select notebook image with fallback
      selectNotebookImageWithBackendFallback('code-server-notebook', createSpawnerPage).then(
        (imageStreamName) => {
          selectedImageStream = imageStreamName;
          cy.log(`Selected imagestream: ${selectedImageStream}`);

          createSpawnerPage.findSubmitButton().click();

          // Wait for workbench to run
          cy.step(`Wait for workbench ${workbenchName} to display a "Running" status`);
          const notebookRow = workbenchPage.getNotebookRow(workbenchName);
          notebookRow.expectStatusLabelToBe('Running', 120000);

          // Use dynamic image name verification based on what was actually selected
          getImageStreamDisplayName(selectedImageStream).then((displayName) => {
            notebookRow.shouldHaveNotebookImageName(displayName);
            notebookRow.shouldHaveContainerSize('Small');

            // Stop workbench
            cy.step('Stop workbench and validate it has been stopped');
            notebookRow.findNotebookStopToggle().click();
            notebookConfirmModal.findStopWorkbenchButton().click();
            notebookRow.expectStatusLabelToBe('Stopped', 120000);

            // Edit the workbench and update
            cy.step('Editing the workbench - both the Name and Description');
            notebookRow.findKebab().click();
            notebookRow.findKebabAction('Edit workbench').click();
            createSpawnerPage.getNameInput().clear().type(editedTestNamespace);
            createSpawnerPage.getDescriptionInput().type(editedTestDescription);
            createSpawnerPage.findSubmitButton().click();

            // Verify that the workbench has been updated
            cy.step('Verifying the Edited details display after updating');
            const notebookEditedRow = workbenchPage.getNotebookRow(editedTestNamespace);
            notebookEditedRow.findNotebookDescription(editedTestDescription);

            // Use dynamic image name verification for the edited workbench too
            getImageStreamDisplayName(selectedImageStream).then((editedDisplayName) => {
              notebookEditedRow.shouldHaveNotebookImageName(editedDisplayName);
              notebookEditedRow.shouldHaveContainerSize('Small');
            });
          });
        },
      );
    },
  );
  it(
    'Verify user can delete PV storage, data connection and workbench in a shared DS project',
    {
      tags: [
        '@Sanity',
        '@SanitySet1',
        '@ODS-1931',
        '@ODS-2218',
        '@Dashboard',
        '@Workbenches',
        '@Bug',
      ],
    },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      // Project navigation and select workbences
      cy.step(`Navigate to workbenches tab of Project ${editTestNamespace}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(editTestNamespace);
      projectListPage.findProjectLink(editTestNamespace).click();

      //Navigate to Connections and create Connection
      cy.step('Navigate to Connections and click to create Connection');
      projectDetails.findSectionTab('connections').click();
      connectionsPage.findCreateConnectionButton().click();

      // Enter validate Connection details into the Connection Modal
      cy.step('Enter valid Connection details and verify creation');
      addConnectionModal.findConnectionTypeDropdown().click();
      addConnectionModal.findS3CompatibleStorageOption().click();
      addConnectionModal.findConnectionNameInput().type(s3Config.NAME);
      addConnectionModal.findConnectionDescriptionInput().type('S3 Bucket Connection');
      addConnectionModal.findAwsKeyInput().type(s3AccessKey);
      addConnectionModal.findAwsSecretKeyInput().type(s3SecretKey);
      addConnectionModal.findEndpointInput().type(s3Config.ENDPOINT);
      addConnectionModal.findRegionInput().type(s3Config.REGION);
      addConnectionModal.findBucketInput().type(s3Config.NAME);
      addConnectionModal.findCreateButton().click();
      connectionsPage.getConnectionRow(s3Config.NAME).find().should('exist');

      // Delete the Connection and confirm that the deletion was successful
      cy.step('Delete the Connection and verify deletion');
      connectionsPage.findKebabToggle().click();
      connectionsPage.getConnectionRow(s3Config.NAME).findKebabAction('Delete').click();
      deleteModal.shouldBeOpen();
      deleteModal.findInput().type(s3Config.NAME);
      deleteModal.findSubmitButton().should('be.enabled').click();
      connectionsPage.findDataConnectionName().should('not.exist');

      //Navigate to Cluster Storage and click to Add Storage
      cy.step('Navigate to Cluster Storage and click to create Cluster Storage');
      projectDetails.findSectionTab('cluster-storages').click();
      // Delete the Cluster Storage and confirm that the deletion was successful
      cy.step('Delete the Cluster Storage and verify deletion');
      // Note reload is required to ensure that the new edited name is propagated
      cy.reload();
      clusterStorage.findKebabToggle().click();
      clusterStorage
        .getClusterStorageRow(pvcStorageName)
        .findKebabAction('Delete storage')
        .click({ force: true });
      deleteModal.shouldBeOpen();
      deleteModal.findInput().type(pvcStorageName);
      deleteModal.findSubmitButton().should('be.enabled').click();
      clusterStorage.findEmptyState().should('exist');
    },
  );
});
