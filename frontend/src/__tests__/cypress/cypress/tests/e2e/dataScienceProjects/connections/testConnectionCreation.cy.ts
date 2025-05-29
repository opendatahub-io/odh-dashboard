import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectDetails, projectListPage } from '#~/__tests__/cypress/cypress/pages/projects';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import type {
  DataScienceProjectData,
  AWSS3BucketDetails,
} from '#~/__tests__/cypress/cypress/types';
import {
  connectionsPage,
  addConnectionModal,
} from '#~/__tests__/cypress/cypress/pages/connections';
import { loadDSPFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { createCleanProject } from '#~/__tests__/cypress/cypress/utils/projectChecker';
import { deleteModal } from '#~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { AWS_BUCKETS } from '#~/__tests__/cypress/cypress/utils/s3Buckets';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';

describe('Verify Connections - Creation and Deletion', () => {
  let testData: DataScienceProjectData;
  let projectName: string;
  let s3Config: AWSS3BucketDetails;
  let s3AccessKey: string;
  let s3SecretKey: string;
  const uuid = generateTestUUID();

  // Setup: Load test data and ensure clean state
  retryableBefore(() => {
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

    return loadDSPFixture('e2e/dataScienceProjects/testDataConnectionCreation.yaml')
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectDCResourceName}-${uuid}`;
        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        return createCleanProject(projectName);
      })
      .then(() => {
        cy.log(`Project ${projectName} confirmed to be created and verified successfully`);
      });
  });
  after(() => {
    // Delete provisioned Project
    if (projectName) {
      cy.log(`Deleting Project ${projectName} after the test has finished.`);
      deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
    }
  });

  it(
    'Create and Delete a Connection',
    { tags: ['@Sanity', '@SanitySet1', '@ODS-1826', '@Dashboard'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation
      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

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
    },
  );
});
