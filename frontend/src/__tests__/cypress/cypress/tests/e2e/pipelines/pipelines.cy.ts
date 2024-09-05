import {
  createOpenShiftProject,
  deleteOpenShiftProject,
} from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { createDataConnection } from '~/__tests__/cypress/cypress/utils/oc_commands/dataConnection';
import { createDSPASecret, createDSPA } from '~/__tests__/cypress/cypress/utils/oc_commands/dspa';
import { ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { AWS_BUCKETS } from '~/__tests__/cypress/cypress/utils/s3Buckets';

import { projectListPage, projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { pipelineImportModal } from '~/__tests__/cypress/cypress/pages/pipelines/pipelineImportModal';
import { createRunPage } from '~/__tests__/cypress/cypress/pages/pipelines/createRunPage';
import {
  pipelineDetails,
  pipelineRunDetails,
} from '~/__tests__/cypress/cypress/pages/pipelines/topology';
import type {
  DataConnectionReplacements,
  DspaSecretReplacements,
  DspaReplacements,
} from '~/__tests__/cypress/cypress/types';

const projectName = 'test-pipelines-prj';
const dspaSecretName = 'dashboard-dspa-secret';
const testPipelineName = 'test-pipelines-pipeline';
const testRunName = 'test-pipelines-run';

describe('An admin user can import and run a pipeline', { testIsolation: false }, () => {
  before(() => {
    // Provision a Project
    createOpenShiftProject(projectName);

    // Create a pipeline compatible Data Connection
    const dataConnectionReplacements: DataConnectionReplacements = {
      NAMESPACE: projectName,
      AWS_ACCESS_KEY_ID: Buffer.from(AWS_BUCKETS.AWS_ACCESS_KEY_ID).toString('base64'),
      AWS_DEFAULT_REGION: Buffer.from(AWS_BUCKETS.BUCKET_2.REGION).toString('base64'),
      AWS_S3_BUCKET: Buffer.from(AWS_BUCKETS.BUCKET_2.NAME).toString('base64'),
      AWS_S3_ENDPOINT: Buffer.from(AWS_BUCKETS.BUCKET_2.ENDPOINT).toString('base64'),
      AWS_SECRET_ACCESS_KEY: Buffer.from(AWS_BUCKETS.AWS_SECRET_ACCESS_KEY).toString('base64'),
    };
    createDataConnection(dataConnectionReplacements);

    // Configure Pipeline server: Create DSPA Secret
    const dspaSecretReplacements: DspaSecretReplacements = {
      DSPA_SECRET_NAME: dspaSecretName,
      NAMESPACE: projectName,
      AWS_ACCESS_KEY_ID: Buffer.from(AWS_BUCKETS.AWS_ACCESS_KEY_ID).toString('base64'),
      AWS_SECRET_ACCESS_KEY: Buffer.from(AWS_BUCKETS.AWS_SECRET_ACCESS_KEY).toString('base64'),
    };
    createDSPASecret(dspaSecretReplacements);

    // Configure Pipeline server: Create DSPA
    const dspaReplacements: DspaReplacements = {
      DSPA_SECRET_NAME: dspaSecretName,
      NAMESPACE: projectName,
      AWS_S3_BUCKET: AWS_BUCKETS.BUCKET_2.NAME,
    };
    createDSPA(dspaReplacements);
  });

  after(() => {
    // Delete provisioned Project
    deleteOpenShiftProject(projectName);
  });

  it('An admin User can Import and Run a Pipeline', () => {
    // Login as an admin
    cy.visitWithLogin('/', ADMIN_USER);

    /**
     * Import Pipeline by URL from Project Details view
     */
    projectListPage.navigate();

    // Open the project
    projectListPage.filterProjectByName(projectName);
    projectListPage.findProjectLink(projectName).click();

    // Increasing the timeout to ~3mins so the DSPA can be loaded
    projectDetails.findImportPipelineButton(180000).click();

    // Fill tue Import Pipeline modal
    pipelineImportModal.findPipelineNameInput().type(testPipelineName);
    pipelineImportModal.findPipelineDescriptionInput().type('Pipeline Description');
    pipelineImportModal.findImportPipelineRadio().click();
    pipelineImportModal
      .findPipelineUrlInput()
      //TODO: modify this URL once the PR is merged
      .type(
        'https://raw.githubusercontent.com/opendatahub-io/odh-dashboard/caab82536b4dd5d39fb7a06a6c3248f10c183417/frontend/src/__tests__/resources/pipelines_samples/dummy_pipeline_compiled.yaml',
      );
    pipelineImportModal.submit();

    // Verify that we are at the details page of the pipeline by checking the title
    // It can take a little longer to load
    pipelineDetails.findPageTitle(60000).should('have.text', testPipelineName);

    /**
     * Run the Pipeline using the Actions button in the pipeline detail view
     */

    pipelineDetails.selectActionDropdownItem('Create run');

    //Fill the Create run fields
    createRunPage.findExperimentSelect().click();
    createRunPage.selectExperimentByName('Default');
    createRunPage.fillName(testRunName);
    createRunPage.fillDescription('Run Description');
    createRunPage.findSubmitButton().click();

    //Redirected to the Graph view of the created run
    pipelineRunDetails.expectStatusLabelToBe('Succeeded', 180000);
  });
});
