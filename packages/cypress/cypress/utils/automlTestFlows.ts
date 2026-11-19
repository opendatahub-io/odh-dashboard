import { HTPASSWD_CLUSTER_ADMIN_USER } from './e2eUsers';
import { waitForAutoXDspaReady } from './oc_commands/autoX';
import { waitForManagedPipelines } from './autoXPipelines';
import { loadAutomlConfigurationFixture } from './dataLoader';
import { automlExperimentsPage } from '../pages/automl/experimentsPage';
import { automlConfigurePage } from '../pages/automl/configurePage';
import { automlResultsPage } from '../pages/automl/resultsPage';
import { AUTOML_RUN_TIMEOUT } from '../support/timeouts';
import type { AutomlTestData } from '../types';

/** Upload or replace a CSV while the Upload file tab is selected. */
export const uploadAutomlTrainingDataFile = (trainingDataFile: string, uuid: string): void => {
  const uploadFileName = `${trainingDataFile.replace('.csv', '')}-${uuid}.csv`;
  automlConfigurePage
    .findUploadFileInput()
    .selectFile(
      { contents: `resources/automl/${trainingDataFile}`, fileName: uploadFileName },
      { force: true },
    );
  automlConfigurePage
    .findUploadedFileCell(60000)
    .should('be.visible')
    .and('contain.text', uploadFileName);
};

/**
 * Configure an AutoML run up to (but not including) task-specific options.
 *
 * Handles: login, wait for DSPA + managed pipelines, navigate to experiments
 * page, click create run, fill name/description, select S3 connection, upload
 * CSV file, and verify/select the file via the file explorer.
 * Set selectFromBucket to false to keep the uploaded file selected for replacement tests.
 *
 * After this, configure task-specific options (task type, columns, preset, etc.)
 * then call `submitAutomlRun()`.
 */
export const configureAutomlRun = (
  testData: AutomlTestData,
  projectName: string,
  uuid: string,
  options: { selectFromBucket?: boolean } = {},
): void => {
  cy.step('Login and wait for pipeline server');
  cy.visitWithLogin(automlExperimentsPage.pathWithDefaults(), HTPASSWD_CLUSTER_ADMIN_USER);
  waitForAutoXDspaReady(projectName);
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
  uploadAutomlTrainingDataFile(testData.trainingDataFile, uuid);

  if (options.selectFromBucket === false) {
    return;
  }

  cy.step('Verify uploaded file is browsable in file explorer and select it');
  automlConfigurePage.findSelectFileToggle().find('button').click();
  automlConfigurePage.findBrowseBucketButton().click();
  automlConfigurePage.findFileExplorerTable().should('be.visible');
  automlConfigurePage.findFileExplorerSearch(30000).should('be.visible').type(uploadFileName);
  automlConfigurePage.findFileExplorerTable().contains('td', uploadFileName).should('be.visible');
  automlConfigurePage.findFileExplorerTable().contains('td', uploadFileName).click();
  automlConfigurePage.findFileExplorerSelectBtn().click();
};

/** Select a prediction type and its dataset columns after uploading training data. */
export const configureAutomlPredictionType = (testData: AutomlTestData): void => {
  const targetColumn = testData.labelColumn ?? testData.targetColumn;
  if (!targetColumn) {
    throw new Error('AutoML test data must specify a target column.');
  }

  cy.step('Select the target column and prediction type');
  automlConfigurePage.findTargetColumnSelect().should('be.enabled').click();
  automlConfigurePage.findSelectOption(targetColumn).click();
  automlConfigurePage.findTaskTypeCard(testData.taskType).click();
  automlConfigurePage.findTaskTypeRadio(testData.taskType).should('be.checked');

  if (testData.taskType === 'timeseries') {
    if (!testData.timestampColumn) {
      throw new Error('Time series test data must specify a timestamp column.');
    }
    automlConfigurePage.findTimestampColumnSelect().should('be.enabled').click();
    automlConfigurePage.findSelectOption(testData.timestampColumn).click();
    if (testData.idColumn) {
      automlConfigurePage.findIdColumnSelect().should('be.enabled').click();
      automlConfigurePage.findSelectOption(testData.idColumn).click();
    }
  }
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

/** Verify Save applies column visibility and Cancel discards a pending change. */
export const verifyAutomlLeaderboardColumns = (): void => {
  cy.step('Save hiding a leaderboard column and verify its header and data disappear');
  automlResultsPage.findRankHeader().scrollIntoView().should('be.visible');
  automlResultsPage.findRankCell(1).scrollIntoView().should('be.visible');
  automlResultsPage.findManageColumnsButton().click();
  automlResultsPage.findRankColumnCheck().should('be.checked').uncheck();
  automlResultsPage.findManageColumnsSaveButton().should('be.enabled').click();
  automlResultsPage.findManageColumnsModal().should('not.exist');
  automlResultsPage.findRankHeader().should('not.exist');
  automlResultsPage.findRankCell(1).should('not.exist');

  cy.step('Cancel showing the column and keep the saved table unchanged');
  automlResultsPage.findManageColumnsButton().click();
  automlResultsPage.findRankColumnCheck().should('not.be.checked').check();
  automlResultsPage.findManageColumnsCancelButton().click();
  automlResultsPage.findManageColumnsModal().should('not.exist');
  automlResultsPage.findRankHeader().should('not.exist');
  automlResultsPage.findRankCell(1).should('not.exist');

  cy.step('Reopen the modal and save showing the column again');
  automlResultsPage.findManageColumnsButton().click();
  automlResultsPage.findRankColumnCheck().should('not.be.checked').check();
  automlResultsPage.findManageColumnsSaveButton().click();
  automlResultsPage.findManageColumnsModal().should('not.exist');
  automlResultsPage.findRankHeader().scrollIntoView().should('be.visible');
  automlResultsPage.findRankCell(1).scrollIntoView().should('be.visible');

  cy.step('Keep the saved checkbox state when reopening the modal');
  automlResultsPage.findManageColumnsButton().click();
  automlResultsPage.findRankColumnCheck().should('be.checked');
  automlResultsPage.findManageColumnsCancelButton().click();
  automlResultsPage.findManageColumnsModal().should('not.exist');
};

/** Reuse a completed run to check restored settings and discard draft edits without training. */
export const verifyAutomlReconfiguration = (testData: AutomlTestData, uuid: string): void => {
  loadAutomlConfigurationFixture('e2e/automl/testAutomlConfiguration.yaml').then(
    (configuration) => {
      const sourcePreset = testData.preset ?? configuration.defaultPreset;
      const sourceTopN = testData.topN ?? configuration.topModels.min;
      const targetColumn = testData.labelColumn ?? testData.targetColumn;
      const trainingDataFile = `${testData.trainingDataFile.replace('.csv', '')}-${uuid}.csv`;

      const verifyRestoredSettings = (): void => {
        automlConfigurePage
          .findNameInput(30000)
          .should('have.value', `${testData.runName}${configuration.reconfigure.runNameSuffix}`);
        automlConfigurePage.findNextButton().should('be.enabled').click();
        automlConfigurePage.findSelectedSecretInput().should('have.value', testData.secretName);
        automlConfigurePage.findSelectedTrainingDataFile().should('contain.text', trainingDataFile);
        automlConfigurePage
          .findTargetColumnSelect()
          .should('be.enabled')
          .and('contain.text', targetColumn);
        automlConfigurePage.findTaskTypeRadio(testData.taskType).should('be.checked');
        automlConfigurePage.findPresetRadio(sourcePreset).should('be.checked');
        automlConfigurePage.findTopNInputField().should('have.value', sourceTopN);
        automlConfigurePage
          .findOptimizationMetricValue()
          .should('contain.text', testData.changedMetricLabel);
        automlConfigurePage.findOptimizationMetricEditButton().click();
        automlConfigurePage
          .findEvalMetricRadio(testData.changedMetricKey as string)
          .should('be.checked');
        automlConfigurePage.findOptimizationMetricCancelButton().click();
        if (testData.taskType === 'timeseries') {
          automlConfigurePage
            .findTimestampColumnSelect()
            .should('contain.text', testData.timestampColumn);
          automlConfigurePage.findIdColumnSelect().should('contain.text', testData.idColumn);
          automlConfigurePage
            .findPredictionLengthInputField()
            .should('have.value', configuration.predictionLength.default);
        }
        automlConfigurePage.findCreateRunButton().should('be.enabled');
      };

      cy.location('pathname').then((sourcePath) => {
        cy.step('Open Reconfigure and verify settings saved with the original run');
        automlResultsPage.findReconfigureButton().click();
        verifyRestoredSettings();

        cy.step('Edit the draft preset, model count, and metric');
        automlConfigurePage.findPresetRadio(configuration.reconfigure.preset).click();
        automlConfigurePage.findPresetRadio(configuration.reconfigure.preset).should('be.checked');
        // Clearing is ignored by these controlled numeric inputs; replace the selected value instead.
        automlConfigurePage
          .findTopNInputField()
          .type(`{selectall}${configuration.reconfigure.topN}`);
        automlConfigurePage
          .findTopNInputField()
          .should('have.value', configuration.reconfigure.topN);
        verifyAndChangeOptimizationMetric(
          testData.changedMetricLabel as string,
          configuration.defaultMetricKeys[testData.taskType],
          testData.defaultMetricLabel as string,
        );
        if (testData.taskType === 'timeseries') {
          automlConfigurePage
            .findPredictionLengthInputField()
            .type(`{selectall}${configuration.predictionLength.changed}`);
          automlConfigurePage
            .findPredictionLengthInputField()
            .should('have.value', configuration.predictionLength.changed);
        }
        automlConfigurePage.findCreateRunButton().should('be.enabled');

        cy.step('Leave the draft through the source run link and reload the original results');
        automlConfigurePage.findSourceRunLink().click();
        cy.location('pathname').should('eq', sourcePath);
        automlResultsPage.reload();
        automlResultsPage.findLeaderboardTable().should('be.visible');

        cy.step('Reopen Reconfigure and verify the original run kept its saved settings');
        automlResultsPage.findReconfigureButton().click();
        verifyRestoredSettings();
        automlConfigurePage.findSourceRunLink().click();
        cy.location('pathname').should('eq', sourcePath);
        automlResultsPage.findLeaderboardTable().should('be.visible');
      });
    },
  );
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
