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

describe('AutoML Experiments List and Run Management E2E', { testIsolation: false }, () => {
  let testData: AutomlTestData;
  let projectName: string;

  retryableBefore(() =>
    cy
      .fixture('e2e/automl/testAutomlExperimentsAndRunManagement.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as AutomlTestData;
        projectName = `${testData.projectNamePrefix}-${uuid}`;
        provisionProjectForPipelines(projectName, testData.dspaSecretName, testData.awsBucket);
      }),
  );

  after(() => {
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Shows empty state and create run button on experiments page',
    { tags: ['@AutoML', '@AutoMLRegression'] },
    () => {
      cy.step('Login and wait for pipeline server');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      waitForDspaReady(projectName);

      cy.step('Navigate to AutoML experiments page');
      automlExperimentsPage.visit(projectName);

      cy.step('Verify empty state is displayed');
      automlExperimentsPage.findEmptyState(120000).should('exist');

      cy.step('Verify create run button is available');
      automlExperimentsPage.findCreateRunButton().should('be.visible');

      cy.step('Verify AutoML nav item is present');
      automlExperimentsPage.findNavItem().should('be.visible');
    },
  );

  it(
    'Can submit a run and verify it appears in the experiments list',
    { tags: ['@AutoML', '@AutoMLRegression'] },
    () => {
      cy.step('Navigate to AutoML experiments page and create a run');
      automlExperimentsPage.visit(projectName);
      automlExperimentsPage.findEmptyState(120000).should('exist');
      automlExperimentsPage.findCreateRunButton().click();

      cy.step('Step 1 - Fill name and description');
      automlConfigurePage.findNameInput().type(testData.runName);
      automlConfigurePage.findDescriptionInput().type(testData.runDescription);
      automlConfigurePage.findNextButton().click();

      cy.step('Select S3 connection');
      automlConfigurePage.findSecretSelector().click();
      automlConfigurePage.findSecretSelector().type(testData.secretName);
      automlConfigurePage.findSelectOption(new RegExp(testData.secretName, 'i')).click();

      cy.step('Upload CSV file');
      automlConfigurePage.findUploadFileToggle().click();
      automlConfigurePage
        .findUploadFileInput()
        .selectFile(`resources/automl/${testData.trainingDataFile}`, { force: true });
      automlConfigurePage.findUploadSpinner().should('not.exist');
      automlConfigurePage.findUploadedFileCell(/automl-test-data.*\.csv/).should('be.visible');

      cy.step('Select task type and label column');
      automlConfigurePage.findTaskTypeCard('binary').click();
      automlConfigurePage.findLabelColumnSelect().should('not.be.disabled').click();
      automlConfigurePage.findSelectOption(new RegExp(testData.labelColumn as string)).click();

      cy.step('Submit the form');
      automlConfigurePage.findCreateRunButton().click();

      cy.step('Verify redirect to results page');
      cy.url().should('include', '/develop-train/automl/results/');
      automlResultsPage.findRunInProgressMessage().should('be.visible');

      cy.step('Navigate back to experiments page and verify run appears');
      automlExperimentsPage.visit(projectName);
      automlResultsPage.findRunsTable().should('be.visible');
      automlResultsPage.findRunsTable().should('contain.text', testData.runName);
    },
  );

  it(
    'Can open run details drawer and stop a running experiment',
    { tags: ['@AutoML', '@AutoMLRegression'] },
    () => {
      cy.step('Navigate to experiments page');
      automlExperimentsPage.visit(projectName);
      automlResultsPage.findRunsTable().should('be.visible');

      cy.step('Click on the run to view results');
      automlResultsPage.findRunsTable().contains(testData.runName).click();

      cy.step('Open run details drawer');
      automlResultsPage.findRunDetailsButton().click();
      automlResultsPage.findRunDetailsDrawerPanel().should('be.visible');

      cy.step('Close run details drawer');
      automlResultsPage.findRunDetailsDrawerClose().click();
      automlResultsPage.findRunDetailsDrawerPanel().should('not.exist');

      cy.step('Stop the running experiment');
      automlResultsPage.findStopRunButton().click();
      automlResultsPage.findStopRunModal().should('be.visible');
      automlResultsPage.findConfirmStopRunButton().click();

      cy.step('Verify the run is no longer in progress');
      automlResultsPage.findRunInProgressMessage().should('not.exist');
    },
  );
});
