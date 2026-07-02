import type { WBEditTestData, AWSS3BucketDetails } from '../../../../types';
import { NotebookStatusLabel } from '../../../../types';
import { projectDetails, projectListPage } from '../../../../pages/projects';
import {
  workbenchPage,
  workbenchActions,
  createSpawnerPage,
  notebookConfirmModal,
} from '../../../../pages/workbench';
import { HTPASSWD_CLUSTER_ADMIN_USER, LDAP_CONTRIBUTOR_USER } from '../../../../utils/e2eUsers';
import { loadPVCEditFixture } from '../../../../utils/dataLoader';
import { createCleanProject } from '../../../../utils/projectChecker';
import { deleteOpenShiftProject, addUserToProject } from '../../../../utils/oc_commands/project';
import { retryableBefore } from '../../../../utils/retryableHooks';
import {
  addConnectionModal,
  connectionsPage,
  connectionActions,
} from '../../../../pages/connections';
import { deleteModal } from '../../../../pages/components/DeleteModal';
import { AWS_BUCKETS } from '../../../../utils/s3Buckets';
import {
  clusterStorage,
  clusterStorageActions,
  addClusterStorageModal,
} from '../../../../pages/clusterStorage';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import {
  selectNotebookImageWithBackendFallback,
  getImageStreamDisplayName,
} from '../../../../utils/oc_commands/imageStreams';
import { deriveWorkbenchName } from '../../../../utils/nameGenerator';

describe('Create, Delete and Edit - Workbench Tests', () => {
  let editTestNamespace: string;
  let editedTestNamespace: string;
  let editedTestDescription: string;
  let pvcEditDisplayName: string;
  let connectionDescription: string;
  let contributor: string;
  let s3Config: AWSS3BucketDetails;
  let s3AccessKey: string;
  let s3SecretKey: string;
  let notebookImage: string;
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
        connectionDescription = fixtureData.connectionDescription;
        notebookImage = fixtureData.notebookImage;
        const bucketKey = 'BUCKET_1' as const;
        const bucketConfig = AWS_BUCKETS[bucketKey];

        s3Config = bucketConfig;
        s3AccessKey = AWS_BUCKETS.AWS_ACCESS_KEY_ID;
        s3SecretKey = AWS_BUCKETS.AWS_SECRET_ACCESS_KEY;

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
      tags: ['@Tier1', '@Tier1Set1', '@ODS-1931', '@ODS-2218', '@Dashboard', '@Workbenches'],
    },
    () => {
      const workbenchName = deriveWorkbenchName(editTestNamespace);
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
      selectNotebookImageWithBackendFallback(notebookImage, createSpawnerPage).then(
        (imageStreamName) => {
          selectedImageStream = imageStreamName;
          cy.log(`Selected imagestream: ${selectedImageStream}`);

          createSpawnerPage.findSubmitButton().click();

          // Wait for workbench to run
          cy.step(`Wait for workbench ${workbenchName} to display a "Running" status`);
          const notebookRow = workbenchPage.getNotebookRow(workbenchName);
          notebookRow.expectStatusLabelToBe(NotebookStatusLabel.Ready, 120000);

          // Use dynamic image name verification based on what was actually selected
          getImageStreamDisplayName(selectedImageStream).then((displayName) => {
            notebookRow.shouldHaveNotebookImageName(displayName);

            // Stop workbench
            cy.step('Stop workbench and validate it has been stopped');
            notebookRow.findNotebookStopToggle().click();
            notebookConfirmModal.findStopWorkbenchButton().click();
            notebookRow.expectStatusLabelToBe(NotebookStatusLabel.Stopped, 120000);

            // Edit the workbench and update
            cy.step('Editing the workbench - both the Name and Description');
            notebookRow.findKebab().click();
            // If we click to edit the wb immediately after stopping we risk encountering a sync issue when editing the wb, delay remedies this
            workbenchActions.findEditWorkbenchAction().trigger('click', { delay: 2000 });
            createSpawnerPage.getNameInput().clear().type(editedTestNamespace);
            createSpawnerPage.getDescriptionInput().type(editedTestDescription);
            createSpawnerPage.findSubmitButton().click();

            // Handle potential 409 conflict when the workbench resource was modified between load and submit
            cy.step('Handle potential conflict error on submit');
            createSpawnerPage.handleConflictIfPresent();

            // Verify that the workbench has been updated
            cy.step('Verifying the Edited details display after updating');
            workbenchPage.findNotebookTable(30000).should('exist');
            const notebookEditedRow = workbenchPage.getNotebookRow(editedTestNamespace);
            notebookEditedRow.findNotebookDescription(editedTestDescription);

            // Use dynamic image name verification for the edited workbench too
            getImageStreamDisplayName(selectedImageStream).then((editedDisplayName) => {
              notebookEditedRow.shouldHaveNotebookImageName(editedDisplayName);
            });
          });
        },
      );
    },
  );
  it(
    'Verify user can delete PV storage, data connection and workbench in a shared DS project',
    {
      tags: ['@Tier1', '@Tier1Set1', '@ODS-1931', '@ODS-2218', '@Dashboard', '@Workbenches'],
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
      addConnectionModal.findConnectionDescriptionInput().type(connectionDescription);
      addConnectionModal.findAwsKeyInput().type(s3AccessKey);
      addConnectionModal.findAwsSecretKeyInput().type(s3SecretKey);
      addConnectionModal.findEndpointInput().type(s3Config.ENDPOINT);
      addConnectionModal.findRegionInput().type(s3Config.REGION);
      addConnectionModal.findBucketInput().type(s3Config.NAME);
      addConnectionModal.findCreateButton().click();
      connectionsPage.getConnectionRow(s3Config.NAME).find().should('exist');

      // Delete the Connection and confirm that the deletion was successful
      cy.step('Delete the Connection and verify deletion');
      connectionsPage.getConnectionRow(s3Config.NAME).findKebab().click();
      connectionActions.findDeleteConnectionAction().click();
      deleteModal.shouldBeOpen();
      deleteModal.findInput().type(s3Config.NAME);
      deleteModal.findSubmitButton().should('be.enabled').click();
      connectionsPage.findDataConnectionName().should('not.exist');

      //Navigate to Cluster Storage and create a new Cluster Storage
      cy.step('Navigate to Cluster Storage and create Cluster Storage');
      const deleteTestStorageName = `delete-test-storage-${uuid}`;
      projectDetails.findSectionTab('cluster-storages').click();
      clusterStorage.findAddClusterStorageButton().click();
      addClusterStorageModal.findNameInput().type(deleteTestStorageName);
      addClusterStorageModal.findSubmitButton().should('not.be.disabled').click();
      clusterStorage.getClusterStorageRow(deleteTestStorageName).find().should('exist');

      // Delete the Cluster Storage and confirm that the deletion was successful
      cy.step('Delete the Cluster Storage and verify deletion');
      clusterStorage.getClusterStorageRow(deleteTestStorageName).findKebab().click();
      clusterStorageActions.findDeleteStorageAction().click();
      deleteModal.shouldBeOpen();
      deleteModal.findInput().type(deleteTestStorageName);
      deleteModal.findSubmitButton().should('be.enabled').click();
      cy.contains(deleteTestStorageName).should('not.exist');
    },
  );
});
