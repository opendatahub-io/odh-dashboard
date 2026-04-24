import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import { waitForDspaReady } from '../../../utils/oc_commands/dspa';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { AutomlTestData } from '../../../types';
import { automlExperimentsPage, automlConfigurePage } from '../../../pages/automl';

const uuid = generateTestUUID();

describe('AutoML Select File from Bucket E2E', { testIsolation: false }, () => {
  let testData: AutomlTestData;
  let projectName: string;

  retryableBefore(() =>
    cy.fixture('e2e/automl/testAutomlSelectFile.yaml', 'utf8').then((yamlContent: string) => {
      testData = yaml.load(yamlContent) as AutomlTestData;
      projectName = `${testData.projectNamePrefix}-${uuid}`;
      provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);
    }),
  );

  after(() => {
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Can create an AutoML run by selecting a file from the S3 bucket',
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

      cy.step('Select S3 connection');
      automlConfigurePage.findSecretSelector().click();
      automlConfigurePage.findSecretSelector().type(testData.secretName);
      automlConfigurePage.findSelectOption(new RegExp(testData.secretName, 'i')).click();

      cy.step('Verify Select File mode is the default');
      automlConfigurePage
        .findSelectFileToggle()
        .find('button')
        .should('have.attr', 'aria-pressed', 'true');

      cy.step('Open file explorer and browse for a CSV file');
      automlConfigurePage.findBrowseBucketButton().click();
      automlConfigurePage.findFileExplorerTable().should('be.visible');

      cy.step('Search for the training data file and select it');
      automlConfigurePage.findFileExplorerSearch().type(testData.trainingDataFile);
      automlConfigurePage
        .findFileExplorerTable()
        .contains('td', testData.trainingDataFile)
        .parent('tr')
        .click();
      automlConfigurePage.findFileExplorerSelectBtn().click();

      cy.step('Verify selected file appears in the form');
      automlConfigurePage
        .findUploadedFileCell(new RegExp(testData.trainingDataFile))
        .should('be.visible');
    },
  );
});
