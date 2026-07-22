import { HTPASSWD_CLUSTER_ADMIN_USER } from './e2eUsers';
import { waitForDspaReady } from './oc_commands/dspa';
import { waitForManagedPipelines } from './autoXPipelines';
import { automlExperimentsPage } from '../pages/automl/experimentsPage';
import { automlConfigurePage } from '../pages/automl/configurePage';
import { automlResultsPage } from '../pages/automl/resultsPage';
import { AUTOML_RUN_TIMEOUT } from '../support/timeouts';
import type { AutomlTestData } from '../types';

/**
 * Configure an AutoML run up to (but not including) task-specific options.
 *
 * Handles: login, wait for DSPA + managed pipelines, navigate to experiments
 * page, click create run, fill name/description, select S3 connection, upload
 * CSV file, and verify/select the file via the file explorer.
 *
 * After this, configure task-specific options (task type, columns, preset, etc.)
 * then call `submitAutomlRun()`.
 */
export const configureAutomlRun = (
  testData: AutomlTestData,
  projectName: string,
  uuid: string,
): void => {
  cy.step('Login and wait for pipeline server');
  cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
  waitForDspaReady(projectName);
  waitForManagedPipelines(projectName);

  cy.step('Navigate to AutoML experiments page');
  automlExperimentsPage.visit(projectName);

  cy.step('Wait for pipeline server to be fully ready and click Create run');
  automlExperimentsPage.findAnyCreateRunButton({ timeout: 120000 }).click();

  cy.step('Step 1 - Fill name and description');
  automlConfigurePage.findNameInput(30000).should('be.visible').type(testData.runName);
  automlConfigurePage.findDescriptionInput().type(testData.runDescription);
  automlConfigurePage.findNextButton().click();

  cy.step('Verify configure step subtitle shows the run name');
  automlConfigurePage.findConfigureStepSubtitle().should('contain.text', testData.runName);

  cy.step('Select S3 connection');
  automlConfigurePage.findSecretSelector().click();
  automlConfigurePage.findSecretSelector().type(testData.secretName);
  automlConfigurePage.findSelectOption(new RegExp(testData.secretName, 'i')).click();

  cy.step('Upload CSV file');
  const uploadFileName = `${testData.trainingDataFile.replace('.csv', '')}-${uuid}.csv`;
  automlConfigurePage.findUploadFileToggle().click();
  automlConfigurePage
    .findUploadFileInput()
    .selectFile(
      { contents: `resources/automl/${testData.trainingDataFile}`, fileName: uploadFileName },
      { force: true },
    );

  cy.step('Wait for upload to complete');
  automlConfigurePage.findUploadedFileCell(60000).should('be.visible');

  cy.step('Verify uploaded file is browsable in file explorer and select it');
  automlConfigurePage.findSelectFileToggle().find('button').click();
  automlConfigurePage.findBrowseBucketButton().click();
  automlConfigurePage.findFileExplorerTable().should('be.visible');
  automlConfigurePage.findFileExplorerSearch(30000).should('be.visible').type(uploadFileName);
  automlConfigurePage.findFileExplorerTable().contains('td', uploadFileName).should('be.visible');
  automlConfigurePage.findFileExplorerTable().contains('td', uploadFileName).click();
  automlConfigurePage.findFileExplorerSelectBtn().click();
};

/**
 * Submit the AutoML run and verify redirect to results page.
 * Call after `configureAutomlRun()` and task-specific configuration.
 */
export const submitAutomlRun = (): void => {
  cy.step('Submit the form');
  automlConfigurePage.findCreateRunButton().click();

  cy.step('Verify redirect to results page');
  cy.url().should('include', '/develop-train/automl/results/');

  cy.step('Verify the run is in progress');
  automlResultsPage.findRunInProgressMessage(30000).should('be.visible');
};

/**
 * Navigate to the experiments page and verify a run appears in the runs table.
 */
export const verifyAutomlRunSubmitted = (projectName: string, runName: string): void => {
  cy.step('Navigate back to experiments page and verify run appears');
  automlExperimentsPage.visit(projectName);
  automlResultsPage.findRunsTable().should('be.visible');
  automlResultsPage.findRunsTable().should('contain.text', runName);
};

/**
 * Wait for an AutoML run to complete and verify the leaderboard appears.
 * Timeout can be overridden via AUTOML_RUN_TIMEOUT environment variable.
 */
export const waitForAutomlRunCompletion = (timeoutMs?: number): void => {
  const timeout = timeoutMs ?? AUTOML_RUN_TIMEOUT;

  cy.step(`Wait for AutoML run to complete (timeout: ${timeout}ms)`);
  automlResultsPage.findRunInProgressMessage(timeout).should('not.exist');

  automlResultsPage.findRunStatusLabel().should(($el) => {
    expect($el.text()).to.not.match(/CANCEL|FAIL/i);
  });
  automlResultsPage.findLeaderboardTable().should('be.visible');
  automlResultsPage.findTopRankLabel().should('exist');
};

/**
 * Verify post-run results interaction: leaderboard, drawer, manage columns,
 * model details modal with task-type-specific tabs, and notebook download.
 *
 * Tab visibility per task type:
 * | Tab                | binary | multiclass | regression | timeseries |
 * |--------------------|--------|------------|------------|------------|
 * | model-information  | yes    | yes        | yes        | yes        |
 * | feature-summary    | yes    | yes        | yes        | no         |
 * | model-evaluation   | yes    | yes        | yes        | yes        |
 * | confusion-matrix   | yes    | yes        | no         | no         |
 * | roc-curve          | yes    | yes        | no         | no         |
 * | precision-recall   | yes    | yes        | no         | no         |
 * | backtest-window    | no     | no         | no         | yes        |
 */
export const verifyAutomlResultsInteraction = (
  taskType: 'binary' | 'multiclass' | 'regression' | 'timeseries',
): void => {
  const isClassification = taskType === 'binary' || taskType === 'multiclass';
  const isTimeseries = taskType === 'timeseries';

  cy.step('Verify leaderboard has at least one model row');
  automlResultsPage.findLeaderboardRow(1).should('exist');

  cy.step('Open and close run details drawer');
  automlResultsPage.findRunDetailsButton().click();
  automlResultsPage.findRunDetailsDrawerPanel().should('be.visible');
  automlResultsPage.findRunDetailsDrawerClose().click();
  automlResultsPage.findRunDetailsDrawerPanel().should('not.be.visible');

  cy.step('Open manage columns modal and close it');
  automlResultsPage.findManageColumnsButton().click();
  automlResultsPage.findManageColumnsModal().should('be.visible');
  automlResultsPage.findManageColumnsCancelButton().click();
  automlResultsPage.findManageColumnsModal().should('not.exist');

  cy.step('Open model details modal');
  automlResultsPage.findModelLink(1).click();
  automlResultsPage.findModelDetailsModal().should('be.visible');

  cy.step('Verify expected tabs are present');
  automlResultsPage.findModelDetailsTab('model-information').should('exist');
  automlResultsPage.findModelDetailsTab('model-evaluation').should('exist');

  if (!isTimeseries) {
    automlResultsPage.findModelDetailsTab('feature-summary').should('exist');
    automlResultsPage.findModelDetailsTab('feature-summary').click();
    automlResultsPage.findFeatureSearchInput().should('be.visible');
  } else {
    automlResultsPage.findModelDetailsTab('feature-summary').should('not.exist');
  }

  if (isClassification) {
    automlResultsPage.findModelDetailsTab('confusion-matrix').should('exist');
    automlResultsPage.findModelDetailsTab('confusion-matrix').click();
    automlResultsPage.findConfusionMatrixTable().should('be.visible');

    cy.step('Verify ROC curve tab renders chart');
    automlResultsPage.findModelDetailsTab('roc-curve').should('exist');
    automlResultsPage.findModelDetailsTab('roc-curve').click();
    automlResultsPage.findROCCurveSection().should('exist').scrollIntoView();
    automlResultsPage.findROCCurveChart().should('be.visible');

    cy.step('Verify precision-recall tab renders chart');
    automlResultsPage.findModelDetailsTab('precision-recall').should('exist');
    automlResultsPage.findModelDetailsTab('precision-recall').click();
    automlResultsPage.findPrecisionRecallChart().should('be.visible');

    automlResultsPage.findModelDetailsTab('backtest-window').should('not.exist');
  } else {
    automlResultsPage.findModelDetailsTab('confusion-matrix').should('not.exist');
    automlResultsPage.findModelDetailsTab('roc-curve').should('not.exist');
    automlResultsPage.findModelDetailsTab('precision-recall').should('not.exist');

    if (isTimeseries) {
      cy.step('Verify backtest window tab renders content');
      automlResultsPage.findModelDetailsTab('backtest-window').should('exist');
      automlResultsPage.findModelDetailsTab('backtest-window').click();
      automlResultsPage.findBacktestingContent().should('exist');

      cy.step('Verify summary metric cards');
      automlResultsPage
        .findBacktestingContent()
        .find('.automl-backtest-metric-card')
        .should('have.length', 3);

      cy.step('Verify backtest window chart and metric selector');
      automlResultsPage.findBacktestMetricSelector().scrollIntoView().should('be.visible');
      automlResultsPage.findBacktestWindowChart().scrollIntoView().should('be.visible');

      cy.step('Verify forecast vs. observed charts');
      automlResultsPage.findForecastChart('Best-fit').scrollIntoView().should('be.visible');
      automlResultsPage.findForecastChart('Worst-fit').scrollIntoView().should('be.visible');
    } else {
      automlResultsPage.findModelDetailsTab('backtest-window').should('not.exist');
    }
  }

  cy.step('Close model details modal');
  automlResultsPage.findModelDetailsModalCloseButton().click();
  automlResultsPage.findModelDetailsModal().should('not.exist');

  cy.step('Download notebook (stub window.print)');
  automlResultsPage.findModelLink(1).click();
  automlResultsPage.findModelDetailsModal().should('be.visible');
  cy.window().then((win) => cy.stub(win, 'print'));
  automlResultsPage.findModelDetailsDownloadButton().click();
  cy.window().its('print').should('have.been.calledOnce');
  automlResultsPage.findModelDetailsModalCloseButton().click();
  automlResultsPage.findModelDetailsModal().should('not.exist');
};

/**
 * Verifies the default optimization metric, opens the metric modal,
 * selects a different metric, saves, and verifies the change.
 */
export function verifyAndChangeOptimizationMetric(
  defaultLabel: string,
  changedKey: string,
  changedLabel: string,
): void {
  cy.step('Verify optimization metric defaults correctly');
  automlConfigurePage.findOptimizationMetricValue().should('contain', defaultLabel);

  cy.step('Change optimization metric via modal');
  automlConfigurePage.findOptimizationMetricEditButton().click();
  automlConfigurePage.findOptimizationMetricModal().should('be.visible');
  automlConfigurePage.findEvalMetricRadio(changedKey).click();
  automlConfigurePage.findOptimizationMetricSaveButton().click();
  automlConfigurePage.findOptimizationMetricValue().should('contain', changedLabel);
}
