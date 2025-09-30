import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectListPage, projectDetails } from '#~/__tests__/cypress/cypress/pages/projects';
import { pipelineImportModal } from '#~/__tests__/cypress/cypress/pages/pipelines/pipelineImportModal';
import { createRunPage } from '#~/__tests__/cypress/cypress/pages/pipelines/createRunPage';
import { pipelineRunsGlobal } from '#~/__tests__/cypress/cypress/pages/pipelines/pipelineRunsGlobal';
import {
  pipelinesGlobal,
  pipelineDeleteModal,
} from '#~/__tests__/cypress/cypress/pages/pipelines/pipelinesGlobal';
import { pipelinesTable } from '#~/__tests__/cypress/cypress/pages/pipelines/pipelinesTable';
import {
  pipelineDetails,
  pipelineRunDetails,
} from '#~/__tests__/cypress/cypress/pages/pipelines/topology';
import { provisionProjectForPipelines } from '#~/__tests__/cypress/cypress/utils/pipelines';
import { getIrisPipelinePath } from '#~/__tests__/cypress/cypress/utils/fileImportUtils';
import { createOpenShiftConfigMap } from '#~/__tests__/cypress/cypress/utils/oc_commands/configmap';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';

const uuid = generateTestUUID();
const projectName = `test-dsp-custom-pip-prj-${uuid}`;
const dspaSecretName = 'test-custom-pip-dspa-secret';
const testPipelineIrisName = 'test-iris-pipeline';
const testRunName = 'test-pipelines-run';
const awsBucket = 'BUCKET_2' as const;

describe('An admin user can import and run a pipeline', { testIsolation: false }, () => {
  retryableBefore(() => {
    provisionProjectForPipelines(projectName, dspaSecretName, awsBucket);
    //Create Pipelines ConfigMap With Custom Pip Index Url And Trusted Host
    createOpenShiftConfigMap('ds-pipeline-custom-env-vars', projectName, {
      // The following lines should be snake case
      /* eslint-disable-next-line camelcase */
      pip_index_url: Cypress.env('PIP_INDEX_URL'),
      /* eslint-disable-next-line camelcase */
      pip_trusted_host: Cypress.env('PIP_TRUSTED_HOST'),
    });
  });

  after(() => {
    // Delete provisioned Project
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Verify User Can Create, Run and Delete A Pipeline From DS Project Details Page Using Custom Pip Mirror',
    { tags: ['@Smoke', '@SmokeSet1', '@ODS-2206', '@Pipelines', '@Dashboard'] },
    () => {
      cy.step(`Navigate to Pipelines ${projectName}`);
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
      // It can take a little longer than expected to load
      pipelineDetails.findPageTitle(60000).should('have.text', testPipelineIrisName);

      // Get the pipeline ID and version ID from the URL
      cy.url().then((currentUrl) => {
        const regex = /\/develop-train\/pipelines\/definitions\/[^/]+\/([^/]+)\/([^/]+)\/view/;
        const match = currentUrl.match(regex);

        if (match) {
          const [, pipelineId, versionId] = match;
          cy.log(`Pipeline ID: ${pipelineId}`);
          cy.log(`Version ID: ${versionId}`);

          cy.step(`Create a ${testPipelineIrisName} pipeline run from the Runs view`);
          pipelineRunsGlobal.navigate();
          pipelineRunsGlobal.selectProjectByName(projectName);
          pipelineRunsGlobal.findCreateRunButton().click();

          cy.step('Run the pipeline from the Runs view');
          createRunPage.experimentSelect.findToggleButton().click();
          createRunPage.selectExperimentByName('Default');
          createRunPage.fillName(testRunName);
          createRunPage.fillDescription('Run Description');
          createRunPage.pipelineSelect.openAndSelectItem(testPipelineIrisName);
          createRunPage.pipelineVersionSelect.openAndSelectItem(testPipelineIrisName);
          createRunPage.findSubmitButton().click();

          cy.step('Expect the run to Succeed');
          pipelineRunDetails.expectStatusLabelToBe('Succeeded', 240000);

          cy.step('Delete the pipeline version');
          pipelinesGlobal.navigate();
          // pipelineRunsGlobal.selectProjectByName(projectName);
          const pipelineRowWithVersion = pipelinesTable.getRowById(pipelineId);
          pipelineRowWithVersion.findExpandButton().click();
          pipelineRowWithVersion
            .getPipelineVersionRowById(versionId)
            .findKebabAction('Delete pipeline version')
            .click();
          pipelineDeleteModal.findInput().fill(testPipelineIrisName);
          pipelineDeleteModal.findSubmitButton().click();
          // The line below it's not working due to a bug
          // pipelineDeleteModal.shouldBeOpen(false);
          cy.get('[role=dialog]').should('not.exist');

          cy.step('Verify that the pipeline version no longer exist');
          const pipelineRowWithVersionDeleted = pipelinesTable.getRowById(pipelineId);
          pipelineRowWithVersionDeleted.findExpandButton().click();
          pipelineRowWithVersionDeleted.shouldNotHavePipelineVersion();

          cy.step('Delete the pipeline');
          const pipelineRow = pipelinesTable.getRowById(pipelineId);
          pipelineRow.findKebabAction('Delete pipeline').click();
          pipelineDeleteModal.findInput().fill(testPipelineIrisName);
          pipelineDeleteModal.findSubmitButton().click();

          cy.step('Verify that the pipeline no longer exist');
          pipelinesTable.shouldBeEmpty();
        } else {
          throw new Error('Pipeline ID and Version ID could not be extracted from the URL.');
        }
      });
    },
  );
});
