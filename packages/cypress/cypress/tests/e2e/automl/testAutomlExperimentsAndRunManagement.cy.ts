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

describe('AutoML Experiments List and Run Management E2E', { testIsolation: false }, () => {
  let testData: AutomlTestData;
  let projectName: string;

  retryableBefore(() =>
    cy
      .fixture('e2e/automl/testAutomlExperimentsAndRunManagement.yaml', 'utf8')
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
      const uploadFileName = `automl-test-data-${uuid}.csv`;
      automlConfigurePage.findUploadFileToggle().click();
      automlConfigurePage
        .findUploadFileInput()
        .selectFile(
          { contents: `resources/automl/${testData.trainingDataFile}`, fileName: uploadFileName },
          { force: true },
        );
      automlConfigurePage.findUploadSpinner().should('not.exist');
      automlConfigurePage.findUploadedFileCell(new RegExp(uploadFileName)).should('be.visible');

      cy.step('Select task type and label column');
      automlConfigurePage.findTaskTypeCard('binary').click();
      automlConfigurePage.findLabelColumnSelect().should('not.be.disabled').click();
      automlConfigurePage.findSelectOption(new RegExp(testData.labelColumn as string)).click();

      cy.step('Set top N models to minimize run time');
      automlConfigurePage.setTopN(testData.topN as number);

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
    'Can stop a running experiment from the results page',
    { tags: ['@AutoML', '@AutoMLRegression'] },
    () => {
      cy.step('Click on the run to go to results page');
      automlResultsPage.findRunsTable().contains(testData.runName).click();

      cy.step('Verify run is in progress');
      automlResultsPage.findRunInProgressMessage().should('be.visible');

      cy.step('Click stop button and confirm');
      automlResultsPage.findStopRunButton().click();
      automlResultsPage.findStopRunModal().should('be.visible');
      automlResultsPage.findConfirmStopRunButton().click();

      cy.step('Verify run status shows as canceling, canceled, or failed');
      automlResultsPage
        .findRunStatusLabel(80000)
        .invoke('text')
        .should('match', /CANCEL|FAIL/i);
    },
  );
});
