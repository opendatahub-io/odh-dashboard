import {
  RuntimeStateKF,
  runtimeStateLabels,
} from '@odh-dashboard/internal/concepts/pipelines/kfTypes';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { projectListPage, projectDetails } from '../../../pages/projects';
import { pipelineImportModal } from '../../../pages/pipelines/pipelineImportModal';
import { createRunPage } from '../../../pages/pipelines/createRunPage';
import { pipelineDetails, pipelineRunDetails } from '../../../pages/pipelines/topology';
import { provisionProjectForPipelines } from '../../../utils/pipelines';
import { waitForDspaReady } from '../../../utils/oc_commands/dspa';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { loadPipelineFixture } from '../../../utils/dataLoader';
import type { PipelineTestData } from '../../../types';

const uuid = generateTestUUID();
const awsBucket = 'BUCKET_3' as const;

describe('An admin user can import and run a pipeline', { testIsolation: false }, () => {
  let testData: PipelineTestData;
  let projectName: string;

  retryableBefore(() =>
    loadPipelineFixture('e2e/pipelines/testPipelines.yaml').then(
      (fixtureData: PipelineTestData) => {
        testData = fixtureData;
        projectName = `${testData.projectNamePrefix}-${uuid}`;
        provisionProjectForPipelines(projectName, testData.dspaSecretName, awsBucket);
      },
    ),
  );

  after(() => {
    // Delete provisioned Project
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'An admin User can Import and Run a Pipeline',
    { tags: ['@Smoke', '@SmokeSet1', '@Dashboard', '@Pipelines', '@ci-dashboard-regression-tags'] },
    () => {
      cy.step('Navigate to Pipelines ${projectName}');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      cy.step('Wait for pipeline server (DSPA) to be ready');
      waitForDspaReady(projectName);

      cy.step('Ensure Import Pipeline button is loaded');
      projectDetails.ensureImportPipelineButtonLoaded();

      cy.step('Import a pipeline by URL');
      projectDetails.findImportPipelineButton().click();
      // Fill the Import Pipeline modal
      pipelineImportModal.findPipelineNameInput().type(testData.pipelineName);
      pipelineImportModal.findPipelineDescriptionInput().type(testData.pipelineDescription);
      pipelineImportModal.findImportPipelineRadio().click();
      pipelineImportModal.findPipelineUrlInput().type(testData.pipelineUrl);
      pipelineImportModal.submit();

      // Verify that we are at the details page of the pipeline by checking the title
      // It can take a little longer to load
      pipelineDetails.findPageTitle(60000).should('have.text', testData.pipelineName);

      cy.step('Run the pipeline from the Actions button in the pipeline detail view');
      pipelineDetails.selectActionDropdownItem('Create run');
      createRunPage.experimentSelect.findToggleButton().click();
      createRunPage.selectExperimentByName(testData.experimentName);
      createRunPage.fillName(testData.runName);
      createRunPage.fillDescription(testData.runDescription);
      createRunPage.findSubmitButton().click();

      cy.step('Expect the run to Succeed');
      //Redirected to the Graph view of the created run
      pipelineRunDetails.expectStatusLabelToBe(
        runtimeStateLabels[RuntimeStateKF.SUCCEEDED],
        240000,
      );
    },
  );
});
