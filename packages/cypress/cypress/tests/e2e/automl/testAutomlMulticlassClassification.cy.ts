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

describe('AutoML Multiclass Classification E2E', { testIsolation: false }, () => {
  let testData: AutomlTestData;
  let projectName: string;

  retryableBefore(() =>
    cy
      .fixture('e2e/automl/testAutomlMulticlassClassification.yaml', 'utf8')
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
    'Can create and submit an AutoML multiclass classification run',
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
      const uploadFileName = `automl-multiclass-test-data-${uuid}.csv`;
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

      cy.step('Select Multiclass Classification prediction type');
      automlConfigurePage.findTaskTypeCard('multiclass').click();

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

      cy.step('Wait for run to complete and verify leaderboard');
      automlResultsPage.waitForRunCompletion();
    },
  );

  it(
    'Can interact with results page (leaderboard, model details, download)',
    { tags: ['@AutoML', '@AutoMLRegression'] },
    () => {
      automlResultsPage.verifyResultsInteraction('multiclass');
    },
  );
});
