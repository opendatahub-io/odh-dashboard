import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectListPage, projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import { pipelineImportModal } from '~/__tests__/cypress/cypress/pages/pipelines/pipelineImportModal';
import { createRunPage } from '~/__tests__/cypress/cypress/pages/pipelines/createRunPage';
import { pipelineRunsGlobal } from '~/__tests__/cypress/cypress/pages/pipelines/pipelineRunsGlobal';
import {
  pipelinesGlobal,
  pipelineDeleteModal,
} from '~/__tests__/cypress/cypress/pages/pipelines/pipelinesGlobal';
import { pipelinesTable } from '~/__tests__/cypress/cypress/pages/pipelines/pipelinesTable';
import {
  pipelineDetails,
  pipelineRunDetails,
} from '~/__tests__/cypress/cypress/pages/pipelines/topology';
import { provisionProjectForPipelines } from '~/__tests__/cypress/cypress/utils/pipelines';
import { getIrisPipelinePath } from '../../../utils/fileImportUtils';
import { createOpenShiftConfigMap } from '../../../utils/oc_commands/configmap';

const projectName = 'test-pipelines-prj';
const dspaSecretName = 'dashboard-dspa-secret';
const testPipelineName = 'test-pipelines-pipeline';
const testPipelineIrisName = 'test-iris-pipeline';
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

  it.skip('An admin User can Import and Run a Pipeline', () => {
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
  });

  it('Verify User Can Create, Run and Delete A DS Pipeline From DS Project Details Page Using Custom Pip Mirror', () => {
    let pipeline_id: string = '';
    let version_id: string = '';

    cy.step('Create Pipelines ConfigMap With Custom Pip Index Url And Trusted Host ');
    const pipConfig = Cypress.env('PIP_CONFIG');
    createOpenShiftConfigMap('ds-pipeline-custom-env-vars', projectName, {
      pip_index_url: pipConfig.PIP_INDEX_URL,
      pip_trusted_host: pipConfig.PIP_TRUSTED_HOST,
    });

    cy.step(`Navigate to DSP ${projectName}`);
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
    projectListPage.navigate();
    projectListPage.filterProjectByName(projectName);
    projectListPage.findProjectLink(projectName).click();

    cy.step('Import a pipeline from a yaml local file');
    // Increasing the timeout to ~3mins so the DSPA can be loaded
    projectDetails.findImportPipelineButton(180000).click();
    // Fill the Import Pipeline modal
    pipelineImportModal.findPipelineNameInput().type(testPipelineIrisName);
    pipelineImportModal.findUploadPipelineRadio().click();
    pipelineImportModal.uploadPipelineYaml(getIrisPipelinePath());
    pipelineImportModal.submit();

    // Verify that we are at the details page of the pipeline by checking the title
    // It can take a little longer to load
    pipelineDetails.findPageTitle(60000).should('have.text', testPipelineIrisName);

    cy.url().then((currentUrl) => {
      const regex = /\/pipelines\/[^/]+\/([^/]+)\/([^/]+)\/view/;
      const match = currentUrl.match(regex);

      if (match) {
        pipeline_id = match[1];
        version_id = match[2];
        cy.log(`Pipeline ID: ${pipeline_id}`);
        cy.log(`Version ID: ${version_id}`);
      } else {
        throw new Error('Pipeline ID and Version ID could not be extracted from the URL.');
      }
    });

    cy.step(`Create a ${testPipelineIrisName} pipeline run from the Runs view`);
    pipelineRunsGlobal.navigate();
    pipelineRunsGlobal.selectProjectByName(projectName);
    pipelineRunsGlobal.findCreateRunButton().click();

    cy.step('Run the pipeline from the Runs view');
    // //Fill the Create run fields
    createRunPage.experimentSelect.findToggleButton().click();
    createRunPage.selectExperimentByName('Default');
    createRunPage.fillName(testRunName);
    createRunPage.fillDescription('Run Description');
    createRunPage.pipelineSelect.openAndSelectItem(testPipelineIrisName);
    createRunPage.pipelineVersionSelect.selectItem(testPipelineIrisName);
    createRunPage.findSubmitButton().click();

    cy.step('Expect the run to Succeed');
    pipelineRunDetails.expectStatusLabelToBe('Succeeded', 180000);

    cy.step('Delete the pipeline version');
    pipelinesGlobal.navigate();
    // pipelineRunsGlobal.selectProjectByName(projectName);
    const pipelineRowWithVersion = pipelinesTable.getRowById(pipeline_id);
    pipelineRowWithVersion.findExpandButton().click();
    pipelineRowWithVersion
      .getPipelineVersionRowById(version_id)
      .findKebabAction('Delete pipeline version')
      .click();
    pipelineDeleteModal.findInput().fill(testPipelineIrisName);
    pipelineDeleteModal.findSubmitButton().click();

    cy.step('Delete the pipeline');
    const pipelineRow = pipelinesTable.getRowById(pipeline_id);
    pipelineRow.findKebabAction('Delete pipeline').click();
    pipelineDeleteModal.findInput().fill(testPipelineIrisName);
    pipelineDeleteModal.findSubmitButton().click();
  });
});

// logPipeline ID: 9a4523be-a396-46fd-b3b7-bd78398d06fa
// 52
// logVersion ID: e3842a7f-b89b-4df4-a808-aaf684b8631d
