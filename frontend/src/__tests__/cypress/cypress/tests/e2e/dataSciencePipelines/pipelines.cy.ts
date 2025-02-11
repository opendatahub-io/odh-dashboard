import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectListPage, projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { pipelineImportModal } from '~/__tests__/cypress/cypress/pages/pipelines/pipelineImportModal';
import { createRunPage } from '~/__tests__/cypress/cypress/pages/pipelines/createRunPage';
import {
  pipelineDetails,
  pipelineRunDetails,
} from '~/__tests__/cypress/cypress/pages/pipelines/topology';
import { provisionProjectForPipelines } from '~/__tests__/cypress/cypress/utils/pipelines';
import { retryableBefore } from '~/__tests__/cypress/cypress/utils/retryableHooks';

const projectName = 'test-pipelines-prj';
const dspaSecretName = 'dashboard-dspa-secret';
const testPipelineName = 'test-pipelines-pipeline';
const testRunName = 'test-pipelines-run';
const awsBucket = 'BUCKET_3' as const;

describe('An admin user can import and run a pipeline', { testIsolation: false }, () => {
  retryableBefore(() => {
    // Create a Project for pipelines
    provisionProjectForPipelines(projectName, dspaSecretName, awsBucket);
  });

  after(() => {
    // Delete provisioned Project
    deleteOpenShiftProject(projectName);
  });

  it(
    'An admin User can Import and Run a Pipeline',
    { tags: ['@Smoke', '@SmokeSet1', '@Dashboard'] },
    () => {
      cy.step('Navigate to DSP ${projectName}');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      cy.step('Import a pipeline by URL');
      // Increasing the timeout to ~3mins so the DSPA can be loaded
      projectDetails.findImportPipelineButton(180000).click();
      // Fill the Import Pipeline modal
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

      cy.step('Run the pipeline from the Actions button in the pipeline detail view');
      pipelineDetails.selectActionDropdownItem('Create run');
      createRunPage.experimentSelect.findToggleButton().click();
      createRunPage.selectExperimentByName('Default');
      createRunPage.fillName(testRunName);
      createRunPage.fillDescription('Run Description');
      createRunPage.findSubmitButton().click();

      cy.step('Expect the run to Succeed');
      //Redirected to the Graph view of the created run
      pipelineRunDetails.expectStatusLabelToBe('Succeeded', 180000);
    },
  );
});
