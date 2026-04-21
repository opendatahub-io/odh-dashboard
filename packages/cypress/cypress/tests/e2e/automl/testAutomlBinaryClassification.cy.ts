import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { provisionProjectForPipelines } from '../../../utils/pipelines';
import { waitForDspaReady } from '../../../utils/oc_commands/dspa';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import {
  automlExperimentsPage,
  automlConfigurePage,
  automlResultsPage,
} from '../../../pages/automl';

type AutomlTestData = {
  projectNamePrefix: string;
  dspaSecretName: string;
  runName: string;
  runDescription: string;
  trainingDataFile: string;
  labelColumn: string;
};

const uuid = generateTestUUID();
const awsBucket = 'BUCKET_2' as const;

describe('AutoML Binary Classification E2E', { testIsolation: false }, () => {
  let testData: AutomlTestData;
  let projectName: string;

  retryableBefore(() =>
    cy
      .fixture('e2e/automl/testAutomlBinaryClassification.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as AutomlTestData;
        projectName = `${testData.projectNamePrefix}-${uuid}`;
        provisionProjectForPipelines(projectName, testData.dspaSecretName, awsBucket);
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
      cy.findByTestId('empty-experiments-state', { timeout: 120000 }).should('exist');
      automlExperimentsPage.findCreateRunButton().click();

      cy.step('Step 1 - Fill name and description');
      automlConfigurePage.findNameInput().type(testData.runName);
      automlConfigurePage.findDescriptionInput().type(testData.runDescription);
      automlConfigurePage.findNextButton().click();

      cy.step('Verify configure step subtitle shows the run name');
      automlConfigurePage.findConfigureStepSubtitle().should('contain.text', testData.runName);

      cy.step('Select S3 connection');
      automlConfigurePage.findSecretSelector().click();
      automlConfigurePage.findSecretSelector().type('ods-ci-ds-pipelines');
      cy.findByRole('option', { name: /ods-ci-ds-pipelines/i }).click();

      cy.step('Upload CSV file to bucket');
      automlConfigurePage.findUploadFileToggle().click();
      automlConfigurePage
        .findUploadFileInput()
        .selectFile(`resources/automl/${testData.trainingDataFile}`, {
          force: true,
        });

      cy.step('Wait for upload to complete');
      automlConfigurePage.findUploadSpinner().should('not.exist');

      cy.step('Switch to browse mode and select the uploaded file');
      automlConfigurePage.findSelectFileToggle().click();
      automlConfigurePage.findBrowseBucketButton().should('be.enabled').click();

      cy.step('Select file from file explorer modal');
      automlConfigurePage.findFileExplorerTable().should('be.visible');
      automlConfigurePage.findFileExplorerRow(testData.trainingDataFile).find('input').check();
      automlConfigurePage.findFileExplorerSelectBtn().click();

      cy.step('Select Binary Classification prediction type');
      automlConfigurePage.findTaskTypeCard('binary').click();

      cy.step('Select label column');
      automlConfigurePage.findLabelColumnSelect().should('be.enabled').click();
      cy.findByRole('option', { name: new RegExp(testData.labelColumn) }).click();

      cy.step('Submit the form');
      automlConfigurePage.findCreateRunButton().click();

      cy.step('Verify redirect to results page');
      cy.url().should('include', '/develop-train/automl/results/');

      cy.step('Verify the run started');
      automlResultsPage.findStopRunButton().should('be.visible', { timeout: 30000 });
    },
  );
});
