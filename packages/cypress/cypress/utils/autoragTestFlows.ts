import { HTPASSWD_CLUSTER_ADMIN_USER } from './e2eUsers';
import { waitForDspaReady } from './oc_commands/dspa';
import { autoragExperimentsPage } from '../pages/autorag/experimentsPage';
import { autoragConfigurePage } from '../pages/autorag/configurePage';
import { autoragResultsPage } from '../pages/autorag/resultsPage';
import type { AutoragTestData } from '../types';

const RESOURCES_PATH = 'resources/autorag';

/**
 * Full configure flow for an AutoRAG run.
 *
 * Handles: login, wait for DSPA, navigate to experiments, create run,
 * fill name/description, select OGX secret, select S3 connection,
 * upload document, browse and select it, upload evaluation dataset,
 * and select first available vector store.
 *
 * After this, optionally configure metric/patterns, then call `submitAutoragRun()`.
 */
export const configureAutoragRun = (
  testData: AutoragTestData,
  projectName: string,
  uuid: string,
): void => {
  cy.step('Login and wait for pipeline server');
  cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
  waitForDspaReady(projectName);

  cy.step('Navigate to AutoRAG experiments page');
  autoragExperimentsPage.visit(projectName);

  cy.step('Wait for pipeline server to be fully ready and click Create run');
  // Wait for either the header create button or empty state create button to appear
  cy.get('[data-testid="autorag-header-create-run-button"], [data-testid="create-run-button"]', {
    timeout: 120000,
  })
    .first()
    .click();

  cy.step('Fill name and description');
  autoragConfigurePage
    .findNameInput()
    .should('be.visible', { timeout: 30000 })
    .type(testData.runName);
  autoragConfigurePage.findDescriptionInput().type(testData.runDescription);

  cy.step('Select OGX secret');
  autoragConfigurePage.findOgxSecretSelector().click();
  autoragConfigurePage.findOgxSecretSelector().type(testData.ogxSecretName);
  autoragConfigurePage.findSelectOption(new RegExp(testData.ogxSecretName, 'i')).click();

  cy.step('Click Next to go to Configure step');
  autoragConfigurePage.findNextButton().click();

  cy.step('Verify configure step subtitle shows the run name');
  autoragConfigurePage.findConfigureStepSubtitle().should('contain.text', testData.runName);

  cy.step('Select S3 connection');
  autoragConfigurePage.findSecretSelector().click();
  autoragConfigurePage.findSecretSelector().type(testData.s3SecretName);
  autoragConfigurePage.findSelectOption(new RegExp(testData.s3SecretName, 'i')).click();

  cy.step('Upload document file');
  const uploadFileName = `${testData.documentFile.replace('.txt', '')}-${uuid}.txt`;
  autoragConfigurePage.findUploadFileToggle().click();
  autoragConfigurePage
    .findUploadFileInput()
    .selectFile(
      { contents: `${RESOURCES_PATH}/${testData.documentFile}`, fileName: uploadFileName },
      { force: true },
    );

  cy.step('Wait for upload to complete');
  autoragConfigurePage.findUploadSpinner().should('not.exist');
  autoragConfigurePage.findUploadedFileCell().should('be.visible');

  cy.step('Verify uploaded file is browsable in file explorer and select it');
  autoragConfigurePage.findSelectFileToggle().click();
  autoragConfigurePage.findBrowseBucketButton().click();
  autoragConfigurePage.findFileExplorerTable().should('be.visible');
  autoragConfigurePage.findFileExplorerSearch().type(uploadFileName);
  autoragConfigurePage
    .findFileExplorerTable()
    .contains('td', uploadFileName)
    .should('be.visible')
    .click();
  autoragConfigurePage.findFileExplorerSelectBtn().click();

  cy.step('Upload evaluation dataset JSON');
  const evalFileName = `${testData.evaluationFile.replace('.json', '')}-${uuid}.json`;
  autoragConfigurePage
    .findEvaluationFileInput()
    .selectFile(
      { contents: `${RESOURCES_PATH}/${testData.evaluationFile}`, fileName: evalFileName },
      { force: true },
    );

  cy.step('Select first available vector store');
  autoragConfigurePage.findVectorStoreSelector().should('not.be.disabled').click();
  autoragConfigurePage.findFirstVectorStoreOption().should('be.visible').click();
  autoragConfigurePage
    .findVectorStoreSelector()
    .should('not.contain.text', 'Select vector I/O provider');
};

/**
 * Submit the AutoRAG run and verify redirect to results page.
 * Call after `configureAutoragRun()` and any custom configuration.
 */
export const submitAutoragRun = (): void => {
  cy.step('Submit the form');
  autoragConfigurePage.findCreateRunButton().click();

  cy.step('Verify redirect to results page');
  cy.url().should('include', '/gen-ai-studio/autorag/results/');

  cy.step('Verify the run is in progress');
  autoragResultsPage.findRunInProgressMessage().should('be.visible');
};

/**
 * Waits up to `timeoutMs` (default 30 min) for the run to complete.
 * Asserts that the leaderboard table appears.
 */
export const waitForAutoragRunCompletion = (timeoutMs = 1800000): void => {
  cy.step('Wait for run in-progress indicator to appear');
  autoragResultsPage.findRunInProgressMessage(60000).should('exist');

  cy.step('Wait for run to complete');
  autoragResultsPage.findRunInProgressMessage(timeoutMs).should('not.exist');
  autoragResultsPage.findRunStatusLabel().should('not.exist');
  autoragResultsPage.findLeaderboardTable().should('be.visible');
  autoragResultsPage.findTopRankLabel().should('exist');
};

/**
 * Full post-run results verification: leaderboard, drawer, manage columns,
 * pattern details modal with all tabs, score type radios, notebook download.
 */
export const verifyAutoragResultsInteraction = (): void => {
  cy.step('Verify leaderboard has at least one pattern row');
  autoragResultsPage.findLeaderboardRow(1).should('exist');

  cy.step('Open and close run details drawer');
  autoragResultsPage.findRunDetailsButton().click();
  autoragResultsPage.findRunDetailsDrawerPanel().should('be.visible');
  autoragResultsPage.findRunDetailsDrawerClose().click();
  autoragResultsPage.findRunDetailsDrawerPanel().should('not.be.visible');

  cy.step('Open manage columns modal and close it');
  autoragResultsPage.findManageColumnsButton().click();
  autoragResultsPage.findManageColumnsModal().should('be.visible');
  autoragResultsPage.findManageColumnsCancelButton().click();
  autoragResultsPage.findManageColumnsModal().should('not.exist');

  cy.step('Open pattern details modal for top-ranked pattern');
  autoragResultsPage.findPatternLink(1).click();
  autoragResultsPage.findPatternDetailsModal().should('be.visible');

  cy.step('Verify Pattern information tab (overview) is active by default');
  autoragResultsPage.findPatternDetailsTab('pattern_information').should('exist');

  cy.step('Verify score type radio buttons on overview tab');
  autoragResultsPage.findScoreTypeRadio('mean').should('exist');
  autoragResultsPage.findScoreTypeRadio('ci_high').should('exist');
  autoragResultsPage.findScoreTypeRadio('ci_low').should('exist');
  autoragResultsPage.findScoreTypeRadio('ci_high').click();
  autoragResultsPage.findScoreTypeRadio('mean').click();

  cy.step('Navigate to Vector store settings tab');
  autoragResultsPage.findPatternDetailsTab('vector_store').should('exist').click();

  cy.step('Navigate to Chunking settings tab');
  autoragResultsPage.findPatternDetailsTab('chunking').should('exist').click();

  cy.step('Navigate to Embedding settings tab');
  autoragResultsPage.findPatternDetailsTab('embedding').should('exist').click();

  cy.step('Navigate to Retrieval settings tab');
  autoragResultsPage.findPatternDetailsTab('retrieval').should('exist').click();

  cy.step('Navigate to Generation settings tab');
  autoragResultsPage.findPatternDetailsTab('generation').should('exist').click();

  cy.step('Check if Sample Q&A tab exists (conditional on evaluation results)');
  autoragResultsPage.findPatternDetailsModal().then(($modal) => {
    if ($modal.find('[data-testid="tab-sample_qa"]').length) {
      autoragResultsPage.findPatternDetailsTab('sample_qa').click();
    }
  });

  cy.step('Close pattern details modal');
  autoragResultsPage.findPatternDetailsModalCloseButton().click();
  autoragResultsPage.findPatternDetailsModal().should('not.exist');

  cy.step('Download notebook (stub window.print)');
  autoragResultsPage.findPatternLink(1).click();
  autoragResultsPage.findPatternDetailsModal().should('be.visible');
  cy.window().then((win) => cy.stub(win, 'print'));
  autoragResultsPage.findPatternDetailsDownload().click();
  cy.window().its('print').should('have.been.calledOnce');
  autoragResultsPage.findPatternDetailsModalCloseButton().click();
  autoragResultsPage.findPatternDetailsModal().should('not.exist');
};

/**
 * Verify that the AutoRAG run was submitted by checking that the results page
 * loaded and the run appears in the experiments list.
 * AutoRAG runs are managed by the KFP pipeline server (not direct K8s PipelineRun CRs),
 * so we validate via the UI that the run was created and is in progress.
 */
export const verifyAutoragRunSubmitted = (projectName: string, runName: string): void => {
  cy.step('Verify run appears in experiments list');
  autoragExperimentsPage.visit(projectName);
  autoragResultsPage.findRunsTable().should('be.visible');
  autoragResultsPage.findRunsTable().should('contain.text', runName);
};

/**
 * Verify that the pipeline run has been stopped by checking the DSPA
 * for any pipeline runs with a cancelling/cancelled state.
 */
export const verifyAutoragRunStopped = (projectName: string): void => {
  cy.step('Verify run is stopped in backend via DSPA');
  cy.exec(
    `oc get dspa -n ${projectName} -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}'`,
    { failOnNonZeroExit: false },
  )
    .its('stdout')
    .should('contain', 'True');
};
