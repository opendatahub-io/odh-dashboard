import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { deleteS3TestFiles } from '../../../utils/oc_commands/s3Cleanup';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { provisionProjectForAutoX, waitForManagedPipelines } from '../../../utils/autoXPipelines';
import { waitForDspaReady } from '../../../utils/oc_commands/dspa';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { AutomlTestData } from '../../../types';
import { automlConfigurePage } from '../../../pages/automl/configurePage';
import { automlExperimentsPage } from '../../../pages/automl/experimentsPage';
import { automlResultsPage } from '../../../pages/automl/resultsPage';
import { isAutomlEnabled, setAutomlEnabled } from '../../../utils/oc_commands/autoX';
import {
  configureAutomlRun,
  submitAutomlRun,
  verifyAutomlRunSubmitted,
} from '../../../utils/automlTestFlows';

const uuid = generateTestUUID();

describe('AutoML Experiments List and Run Management E2E', { testIsolation: false }, () => {
  let testData: AutomlTestData;
  let projectName: string;
  let automlWasEnabled = false;

  retryableBefore(() =>
    cy
      .fixture('e2e/automl/testAutomlExperimentsAndRunManagement.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as AutomlTestData;
        projectName = `${testData.projectNamePrefix}-${uuid}`;
      })
      .then(() =>
        isAutomlEnabled().then((wasEnabled) => {
          automlWasEnabled = wasEnabled;
        }),
      )
      .then(() => setAutomlEnabled(true))
      .then(() => {
        provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);
      }),
  );

  after(() => {
    if (!automlWasEnabled) {
      setAutomlEnabled(false);
    }
    deleteS3TestFiles(projectName, testData.awsBucket, `*${uuid}*`);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Shows empty state and create run button on experiments page',
    { tags: ['@AutoML', '@AutoMLRegression', '@Featureflagged'] },
    () => {
      cy.step('Login and wait for pipeline server');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      waitForDspaReady(projectName);
      waitForManagedPipelines(projectName);

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
    'Can submit a run, verify it in experiments list, and stop it',
    { tags: ['@AutoML', '@AutoMLRegression', '@Featureflagged'] },
    () => {
      configureAutomlRun(testData, projectName, uuid);

      cy.step('Select target column and task type');
      automlConfigurePage.findTargetColumnSelect().should('not.be.disabled').click();
      automlConfigurePage.findSelectOption(new RegExp(testData.labelColumn as string)).click();
      automlConfigurePage.findTaskTypeCard('binary').click();

      cy.step('Set top N models to minimize run time');
      automlConfigurePage.findTopNInputField().type(`{selectall}${testData.topN as number}`);

      submitAutomlRun();

      verifyAutomlRunSubmitted(projectName, testData.runName);

      cy.step('Click on the run to go to results page');
      automlResultsPage.findRunsTable().contains(testData.runName).click();

      cy.step('Verify run is in progress');
      automlResultsPage.findRunInProgressMessage().should('be.visible');

      cy.step('Click stop button and confirm');
      automlResultsPage.findStopRunButton().click();
      automlResultsPage.findStopRunModal().should('be.visible');
      automlResultsPage.findConfirmStopRunButton().click();

      cy.step('Verify run status shows as canceling, canceled, or failed');
      automlResultsPage.findRunStatusLabel(80000).should(($el) => {
        expect($el.text()).to.match(/CANCEL|FAIL/i);
      });
    },
  );
});
