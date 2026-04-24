import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { provisionProjectForPipelines } from '../../../utils/pipelines';
import { waitForDspaReady } from '../../../utils/oc_commands/dspa';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { AutomlTestData } from '../../../types';
import {
  automlExperimentsPage,
  automlConfigurePage,
  automlResultsPage,
} from '../../../pages/automl';

const uuid = generateTestUUID();

describe('AutoML Time Series Forecasting E2E', { testIsolation: false }, () => {
  let testData: AutomlTestData;
  let projectName: string;

  retryableBefore(() =>
    cy.fixture('e2e/automl/testAutomlTimeseries.yaml', 'utf8').then((yamlContent: string) => {
      testData = yaml.load(yamlContent) as AutomlTestData;
      projectName = `${testData.projectNamePrefix}-${uuid}`;
      provisionProjectForPipelines(projectName, testData.dspaSecretName, testData.awsBucket);
    }),
  );

  after(() => {
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Can create and submit an AutoML time series forecasting run',
    { tags: ['@AutoML', '@AutoMLRegression'] },
    () => {
      cy.step('Login and wait for pipeline server');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      waitForDspaReady(projectName);

      cy.step('Navigate to AutoML experiments page');
      automlExperimentsPage.visit(projectName);

      cy.step('Wait for pipeline server to be fully ready and click Create run');
      automlExperimentsPage.findEmptyState(120000).should('exist');
      automlExperimentsPage.findCreateRunButton().click();

      cy.step('Step 1 - Fill name and description');
      automlConfigurePage.findNameInput().type(testData.runName);
      automlConfigurePage.findDescriptionInput().type(testData.runDescription);
      automlConfigurePage.findNextButton().click();

      cy.step('Verify configure step subtitle shows the run name');
      automlConfigurePage.findConfigureStepSubtitle().should('contain.text', testData.runName);

      cy.step('Select S3 connection');
      automlConfigurePage.findSecretSelector().click();
      automlConfigurePage.findSecretSelector().type(testData.secretName);
      automlConfigurePage.findSelectOption(new RegExp(testData.secretName, 'i')).click();

      cy.step('Upload CSV file');
      automlConfigurePage.findUploadFileToggle().click();
      automlConfigurePage
        .findUploadFileInput()
        .selectFile(`resources/automl/${testData.trainingDataFile}`, { force: true });

      cy.step('Wait for upload to complete');
      automlConfigurePage.findUploadSpinner().should('not.exist');
      automlConfigurePage
        .findUploadedFileCell(/automl-timeseries-test-data.*\.csv/)
        .should('be.visible');

      cy.step('Select Time Series Forecasting prediction type');
      automlConfigurePage.findTaskTypeCard('timeseries').click();

      cy.step('Select target column');
      automlConfigurePage.findTargetColumnSelect().should('not.be.disabled').click();
      const targetCol = testData.targetColumn as string;
      automlConfigurePage.findSelectOption(new RegExp(targetCol)).click();

      cy.step('Select timestamp column');
      automlConfigurePage.findTimestampColumnSelect().should('not.be.disabled').click();
      const tsCol = testData.timestampColumn as string;
      automlConfigurePage.findSelectOption(new RegExp(tsCol)).click();

      cy.step('Select ID column');
      automlConfigurePage.findIdColumnSelect().should('not.be.disabled').click();
      const idCol = testData.idColumn as string;
      automlConfigurePage.findSelectOption(new RegExp(idCol)).click();

      cy.step('Select known covariates');
      (testData.knownCovariates as string[]).forEach((covariate) => {
        automlConfigurePage.findKnownCovariatesSelect().click();
        automlConfigurePage.findSelectOption(new RegExp(covariate)).click();
      });

      cy.step('Set prediction length');
      automlConfigurePage.findPredictionLengthInput().clear();
      automlConfigurePage.findPredictionLengthInput().type(String(testData.predictionLength));

      cy.step('Submit the form');
      automlConfigurePage.findCreateRunButton().click();

      cy.step('Verify redirect to results page');
      cy.url().should('include', '/develop-train/automl/results/');

      cy.step('Verify the run is in progress');
      automlResultsPage.findRunInProgressMessage().should('be.visible');
    },
  );
});
