import {
  createOpenShiftProject,
  deleteOpenShiftProject,
  applyOpenShiftYaml,
} from '~/__tests__/cypress/cypress/utils/ocCommands';
import { replacePlaceholdersInYaml } from '~/__tests__/cypress/cypress/utils/yaml_files';
import { ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { AWS_PIPELINES_BUCKET } from '~/__tests__/cypress/cypress/utils/s3Buckets';

import { projectListPage, projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { pipelineImportModal } from '~/__tests__/cypress/cypress/pages/pipelines/pipelineImportModal';
import { pipelinesGlobal } from '~/__tests__/cypress/cypress/pages/pipelines/pipelinesGlobal';
import { pipelinesTable } from '~/__tests__/cypress/cypress/pages/pipelines/pipelinesTable';
import { createRunPage } from '~/__tests__/cypress/cypress/pages/pipelines/createRunPage';
import { pipelineDetails, pipelineRunDetails } from '~/__tests__/cypress/cypress/pages/pipelines/topology';

const projectName = 'test-pipelines-prj';
const dspaSecretName = 'dashboard-dspa-secret';
const testPipelineName = 'test-pipelines-pipeline';
const testRunName = 'test-pipelines-run';

describe('An admin user can import and run a pipeline', { testIsolation: false }, () => {
  before(() => {
    // Provision a Project
    createOpenShiftProject(projectName).then((result) => {
      expect(result.code).to.eq(
        0,
        `ERROR provisioning ${projectName} Project
                                    stdout: ${result.stdout}
                                    stderr: ${result.stderr}`,
      );
    });

    // Create a pipeline compatible Data Connection
    const dataConnectionReplacements = {
      NAMESPACE: projectName,
      AWS_ACCESS_KEY_ID: Buffer.from(AWS_PIPELINES_BUCKET.AWS_ACCESS_KEY_ID).toString('base64'),
      AWS_DEFAULT_REGION: Buffer.from(AWS_PIPELINES_BUCKET.AWS_REGION).toString('base64'),
      AWS_S3_BUCKET: Buffer.from(AWS_PIPELINES_BUCKET.BUCKET_NAME).toString('base64'),
      AWS_S3_ENDPOINT: Buffer.from(AWS_PIPELINES_BUCKET.AWS_ENDPOINT).toString('base64'),
      AWS_SECRET_ACCESS_KEY: Buffer.from(AWS_PIPELINES_BUCKET.AWS_SECRET_ACCESS_KEY).toString(
        'base64',
      ),
    };
    cy.fixture('resources/yaml/data_connection.yml').then((yamlContent) => {
      const modifiedYamlContent = replacePlaceholdersInYaml(
        yamlContent,
        dataConnectionReplacements,
      );
      const tempFilePath = 'cypress/temp_data_connection.yaml';
      applyOpenShiftYaml(modifiedYamlContent, tempFilePath).then((result) => {
        expect(result.code).to.eq(
          0,
          `ERROR applying YAML content
                                      stdout: ${result.stdout}
                                      stderr: ${result.stderr}`,
        );
      });
    });

    // Configure Pipeline server: Create DSPA Secret
    const dspaSecretReplacements = {
      DSPA_SECRET_NAME: dspaSecretName,
      NAMESPACE: projectName,
      AWS_ACCESS_KEY_ID: Buffer.from(AWS_PIPELINES_BUCKET.AWS_ACCESS_KEY_ID).toString('base64'),
      AWS_SECRET_ACCESS_KEY: Buffer.from(AWS_PIPELINES_BUCKET.AWS_SECRET_ACCESS_KEY).toString(
        'base64',
      ),
    };
    cy.fixture('resources/yaml/dspa_secret.yml').then((yamlContent) => {
      const modifiedYamlContent = replacePlaceholdersInYaml(yamlContent, dspaSecretReplacements);
      const tempFilePath = 'cypress/temp_dspa_secret.yaml';
      applyOpenShiftYaml(modifiedYamlContent, tempFilePath).then((result) => {
        expect(result.code).to.eq(
          0,
          `ERROR applying YAML content
                                      stdout: ${result.stdout}
                                      stderr: ${result.stderr}`,
        );
      });
    });

    // Configure Pipeline server: Create DSPA
    const dspaReplacements = {
      DSPA_SECRET_NAME: dspaSecretName,
      NAMESPACE: projectName,
      AWS_S3_BUCKET: AWS_PIPELINES_BUCKET.BUCKET_NAME,
    };
    cy.fixture('resources/yaml/dspa.yml').then((yamlContent) => {
      const modifiedYamlContent = replacePlaceholdersInYaml(yamlContent, dspaReplacements);
      const tempFilePath = 'cypress/temp_dspa.yaml';
      applyOpenShiftYaml(modifiedYamlContent, tempFilePath).then((result) => {
        expect(result.code).to.eq(
          0,
          `ERROR applying YAML content
                                      stdout: ${result.stdout}
                                      stderr: ${result.stderr}`,
        );
      });
    });
  });

  after(() => {
    // Delete provisioned Project
    deleteOpenShiftProject(projectName).then((result) => {
      expect(result.code).to.eq(
        0,
        `ERROR deleting ${projectName} Project
                                    stdout: ${result.stdout}
                                    stderr: ${result.stderr}`,
      );
    });
  });

  it('An admin User can Import and Run a Pipeline', () => {
    // Login as an admin
    cy.visitWithLogin('/', ADMIN_USER);
    cy.findByRole('banner', { name: 'page masthead' }).contains(ADMIN_USER.USERNAME);

    /**
     * Import Pipeline by URL from Project Details view
     */
    projectListPage.navigate();

    // Open the project
    projectListPage.findProjectLink(projectName).click();

    // Increasing the timeout to ~3mins so the DSPA can be loaded
    projectDetails.findImportPipelineButton(180000).click();

    // Fill tue Import Pipeline modal
    pipelineImportModal.findPipelineNameInput().type(testPipelineName);
    pipelineImportModal.findPipelineDescriptionInput().type('Pipeline Description');
    pipelineImportModal.findImportPipelineRadio().click();
    pipelineImportModal
      .findPipelineUrlInput()
      .type(
        'https://raw.githubusercontent.com/red-hat-data-services/ods-ci/master/ods_ci/tests/Resources/Files/pipeline-samples/v2/flip_coin_compiled.yaml',
      );
    pipelineImportModal.submit();

    //Verify that we are at the details page of the pipeline by checking the title
    pipelineDetails.findPageTitle().should('have.text', testPipelineName);

    //TODO: We should be getting the Pipeline ID and Version ID from navigating to Summary tab, but it does not have data-testid
    // Get Pipeline ID and Version ID from URL
    cy.url().then((currentUrl) => {
      // Create a URL object
      const urlObj = new URL(currentUrl);

      // Split the path and extract the segments
      const pathSegments = urlObj.pathname.split('/');

      // Extract PipelineID and pipeline description from an url like: https://xx.apps.xx/pipelines/<project_name>/<pipeline_id>/<pipeline_version_id>/view
      const pipelineID = pathSegments[3];
      const pipelineVersionID = pathSegments[4];

      // Save values as Cypress env vars
      Cypress.env('PipelineID', pipelineID);
      Cypress.env('PipelineDescription', pipelineVersionID);
      
      cy.log(`PipelineID: ${pipelineID}`);
      cy.log(`PipelineDescription: ${pipelineVersionID}`);
    });

    /**
     * Run the Pipeline using the Actions button in the pipeline detail view
     */

    pipelineDetails.selectActionDropdownItem("Create run");

    //Fill the Create run fields
    createRunPage.findExperimentSelect().click();
    createRunPage.selectExperimentByName('Default');
    createRunPage.fillName(testRunName);
    createRunPage.fillDescription('Run Description');
    createRunPage.findSubmitButton().click();

    //Redirected to the Graph view of the created run
    pipelineRunDetails.expectStatusLabelToBe('Succeeded');
  });
});
