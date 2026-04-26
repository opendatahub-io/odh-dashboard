import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { AutomlTestData } from '../../../types';
import { automlConfigurePage, automlResultsPage } from '../../../pages/automl';

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
      automlConfigurePage.submitRunSetup(testData, projectName, uuid);

      cy.step('Select Binary Classification prediction type');
      automlConfigurePage.findTaskTypeCard('binary').click();

      cy.step('Select label column');
      automlConfigurePage.findLabelColumnSelect().should('not.be.disabled').click();
      automlConfigurePage.findSelectOption(new RegExp(testData.labelColumn as string)).click();

      cy.step('Set top N models to minimize run time');
      automlConfigurePage.setTopN(testData.topN as number);

      automlConfigurePage.submitRun();
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

      cy.step('Verify registry select or no-registries warning is shown');
      automlResultsPage.findRegisterModelModal().then(($modal) => {
        if ($modal.find('[data-testid="registry-select-toggle"]').length) {
          automlResultsPage.findRegistrySelectToggle().should('be.visible');
        } else {
          cy.contains('No model registries are available').should('be.visible');
        }
      });

      cy.step('Cancel register model modal');
      automlResultsPage.findRegisterModelCancelButton().click();
      automlResultsPage.findRegisterModelModal().should('not.exist');
    },
  );
});
