import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
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

describe('AutoML Binary Classification E2E', { testIsolation: false }, () => {
  let testData: AutomlTestData;
  let projectName: string;

  retryableBefore(() =>
    cy
      .fixture('e2e/automl/testAutomlBinaryClassification.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as AutomlTestData;
        projectName = `${testData.projectNamePrefix}-${uuid}`;
        provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);
      }),
  );

  after(() => {
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Can create and submit an AutoML binary classification run',
    { tags: ['@Smoke', '@AutoML', '@AutoMLCI'] },
    () => {
      cy.step('Login and wait for pipeline server');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      waitForDspaReady(projectName);

      cy.step('Navigate to AutoML experiments page');
      automlExperimentsPage.visit(projectName);

      cy.step('Wait for pipeline server to be fully ready and click Create run');
      // The page may initially show "There is a problem with the pipeline server"
      // while the DSPA and BFF finish initializing. Reload until the empty state appears.
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
      const uploadFileName = `automl-test-data-${uuid}.csv`;
      automlConfigurePage.findUploadFileToggle().click();
      automlConfigurePage
        .findUploadFileInput()
        .selectFile(
          { contents: `resources/automl/${testData.trainingDataFile}`, fileName: uploadFileName },
          { force: true },
        );

      cy.step('Wait for upload to complete');
      automlConfigurePage.findUploadSpinner().should('not.exist');
      automlConfigurePage.findUploadedFileCell(new RegExp(uploadFileName)).should('be.visible');

      cy.step('Select Binary Classification prediction type');
      automlConfigurePage.findTaskTypeCard('binary').click();

      cy.step('Select label column');
      automlConfigurePage.findLabelColumnSelect().should('not.be.disabled').click();
      automlConfigurePage.findSelectOption(new RegExp(testData.labelColumn as string)).click();

      cy.step('Set top N models to minimize run time');
      automlConfigurePage.setTopN(testData.topN as number);

      cy.step('Submit the form');
      automlConfigurePage.findCreateRunButton().click();

      cy.step('Verify redirect to results page');
      cy.url().should('include', '/develop-train/automl/results/');

      cy.step('Verify the run is in progress');
      automlResultsPage.findRunInProgressMessage().should('be.visible');
    },
  );

  it(
    'Verify binary classification run completes with leaderboard',
    { tags: ['@AutoML', '@AutoMLRegression'] },
    () => {
      cy.step('Wait for run to complete and verify leaderboard');
      automlResultsPage.waitForRunCompletion();
    },
  );

  it(
    'Can interact with results page (leaderboard, model details, download)',
    { tags: ['@AutoML', '@AutoMLRegression'] },
    () => {
      automlResultsPage.verifyResultsInteraction('binary');
    },
  );

  it(
    'Can open register model modal from model details',
    { tags: ['@AutoML', '@AutoMLRegression'] },
    () => {
      cy.step('Open model details for top-ranked model');
      automlResultsPage.findModelLink(1).click();
      automlResultsPage.findModelDetailsModal().should('be.visible');

      cy.step('Open actions menu and click register model');
      automlResultsPage.findModelDetailsActionsToggle().click();
      automlResultsPage.findRegisterModelAction().click();

      cy.step('Verify register model modal is visible');
      automlResultsPage.findRegisterModelModal().should('be.visible');
      automlResultsPage.findRegisterModelNameInput().should('be.visible');
      automlResultsPage.findRegisterModelDescriptionInput().should('be.visible');
      automlResultsPage.findRegistrySelectToggle().should('be.visible');

      cy.step('Cancel register model modal');
      automlResultsPage.findRegisterModelCancelButton().click();
      automlResultsPage.findRegisterModelModal().should('not.exist');
    },
  );
});
