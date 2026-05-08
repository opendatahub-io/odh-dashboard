import {
  RuntimeStateKF,
  runtimeStateLabels,
} from '@odh-dashboard/internal/concepts/pipelines/kfTypes';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { projectListPage, projectDetails } from '../../../pages/projects';
import { pipelineImportModal } from '../../../pages/pipelines/pipelineImportModal';
import { createRunPage } from '../../../pages/pipelines/createRunPage';
import { pipelineRunsGlobal } from '../../../pages/pipelines/pipelineRunsGlobal';
import { pipelinesGlobal, pipelineDeleteModal } from '../../../pages/pipelines/pipelinesGlobal';
import { pipelinesTable } from '../../../pages/pipelines/pipelinesTable';
import { pipelineDetails, pipelineRunDetails } from '../../../pages/pipelines/topology';
import { provisionProjectForPipelines } from '../../../utils/pipelines';
import { waitForDspaReady } from '../../../utils/oc_commands/dspa';
import { getIrisPipelinePath } from '../../../utils/fileImportUtils';
import { createOpenShiftConfigMap } from '../../../utils/oc_commands/configmap';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { loadPipelineFixture } from '../../../utils/dataLoader';
import type { PipelineTestData } from '../../../types';

const uuid = generateTestUUID();
const awsBucket = 'BUCKET_2' as const;

describe('An admin user can import and run a pipeline', { testIsolation: false }, () => {
  let testData: PipelineTestData;
  let projectName: string;

  retryableBefore(() =>
    loadPipelineFixture('e2e/pipelines/testCreateRunDeletePipeline.yaml').then(
      (fixtureData: PipelineTestData) => {
        testData = fixtureData;
        projectName = `${testData.projectNamePrefix}-${uuid}`;
        provisionProjectForPipelines(projectName, testData.dspaSecretName, awsBucket);
        createOpenShiftConfigMap(
          'ds-pipeline-custom-env-vars',
          projectName,
          Object.fromEntries([
            ['pip_index_url', Cypress.env('PIP_INDEX_URL')],
            ['pip_trusted_host', Cypress.env('PIP_TRUSTED_HOST')],
          ]),
        );
      },
    ),
  );

  after(() => {
    // Delete provisioned Project
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Verify User Can Create, Run and Delete A Pipeline From DS Project Details Page Using Custom Pip Mirror',
    { tags: ['@Smoke', '@SmokeSet4', '@ODS-2206', '@Pipelines', '@Dashboard', '@PipelinesCI'] },
    () => {
      cy.step(`Navigate to Pipelines ${projectName}`);
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      cy.step('Wait for pipeline server (DSPA) to be ready');
      waitForDspaReady(projectName);

      cy.step('Ensure Import Pipeline button is loaded');
      projectDetails.ensureImportPipelineButtonLoaded();

      cy.step('Import a pipeline from a yaml local file');
      projectDetails.findImportPipelineButton().click();
      // Fill the Import Pipeline modal
      pipelineImportModal.findPipelineNameInput().type(testData.pipelineName);
      pipelineImportModal.findUploadPipelineRadio().click();
      pipelineImportModal.uploadPipelineYaml(getIrisPipelinePath());
      pipelineImportModal.submit();

      // Verify that we are at the details page of the pipeline by checking the title
      // It can take a little longer than expected to load
      pipelineDetails.findPageTitle(60000).should('have.text', testData.pipelineName);

      // Get the pipeline ID and version ID from the URL
      cy.url().then((currentUrl) => {
        const regex = /\/develop-train\/pipelines\/definitions\/[^/]+\/([^/]+)\/([^/]+)\/view/;
        const match = currentUrl.match(regex);

        if (match) {
          const [, pipelineId, versionId] = match;
          cy.log(`Pipeline ID: ${pipelineId}`);
          cy.log(`Version ID: ${versionId}`);

          cy.step(`Create a ${testData.pipelineName} pipeline run from the Runs view`);
          pipelineRunsGlobal.navigate();
          pipelineRunsGlobal.selectProjectByName(projectName);
          pipelineRunsGlobal.findCreateRunButton().click();

          cy.step('Run the pipeline from the Runs view');
          createRunPage.fillRunGroup(testData.experimentName);
          createRunPage.fillName(testData.runName);
          createRunPage.fillDescription(testData.runDescription);
          createRunPage.pipelineSelect.openAndSelectItem(testData.pipelineName);
          createRunPage.pipelineVersionSelect.openAndSelectItem(testData.pipelineName);
          createRunPage.findSubmitButton().click();

          cy.step('Expect the run to Succeed');
          pipelineRunDetails.expectStatusLabelToBe(
            runtimeStateLabels[RuntimeStateKF.SUCCEEDED],
            240000,
          );

          cy.step('Delete the pipeline version');
          pipelinesGlobal.navigate();
          const pipelineRowWithVersion = pipelinesTable.getRowById(pipelineId);
          pipelineRowWithVersion.findExpandButton().click();
          const versionRow = pipelineRowWithVersion.getPipelineVersionRowById(versionId);
          versionRow.findKebab().click();
          versionRow.findDeletePipelineVersionAction().click();
          pipelineDeleteModal.findInput().fill(testData.pipelineName);
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
          pipelineRow.findKebab().click();
          pipelineRow.findDeletePipelineAction().click();
          pipelineDeleteModal.findInput().fill(testData.pipelineName);
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
