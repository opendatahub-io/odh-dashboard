import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectListPage, projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { pipelineImportModal } from '~/__tests__/cypress/cypress/pages/pipelines/pipelineImportModal';
import { createRunPage } from '~/__tests__/cypress/cypress/pages/pipelines/createRunPage';
import {
  pipelineDetails,
  pipelineRunDetails,
} from '~/__tests__/cypress/cypress/pages/pipelines/topology';
import { provisionProjectForPipelines } from '~/__tests__/cypress/cypress/utils/pipelines';

const projectName = 'test-pipelines-prj';
const dspaSecretName = 'dashboard-dspa-secret';
const testPipelineName = 'test-pipelines-pipeline';
const testRunName = 'test-pipelines-run';

describe('An admin user can import and run a pipeline', { testIsolation: false }, () => {
  before(() => {
    // Create a Project for pipelines
    provisionProjectForPipelines(projectName, dspaSecretName);
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
      .type(
        'https://raw.githubusercontent.com/opendatahub-io/odh-dashboard/refs/heads/main/frontend/src/__tests__/resources/pipelines_samples/dummy_pipeline_compiled.yaml',
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
    createRunPage.experimentSelect.findToggleButton().click();
    createRunPage.selectExperimentByName('Default');
    createRunPage.fillName(testRunName);
    createRunPage.fillDescription('Run Description');
    createRunPage.findSubmitButton().click();

    //Redirected to the Graph view of the created run
    pipelineRunDetails.expectStatusLabelToBe('Succeeded', 180000);
  });
});
