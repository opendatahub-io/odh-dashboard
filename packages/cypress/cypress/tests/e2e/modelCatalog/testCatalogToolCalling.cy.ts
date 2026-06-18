import * as yaml from 'js-yaml';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import { modelCatalog } from '../../../pages/modelCatalog/modelCatalog';
import { modelDetailsPage } from '../../../pages/modelCatalog/modelDetailsPage';
import {
  verifyModelCatalogBackend,
  ensureModelCatalogSourceEnabled,
  waitForModelCatalogCards,
} from '../../../utils/oc_commands/modelCatalog';
import { retryableBefore } from '../../../utils/retryableHooks';
import type { ModelCatalogSourceTestData } from '../../../types';

describe('Verify tool calling configuration in Model Catalog', () => {
  let testData: ModelCatalogSourceTestData;

  retryableBefore(() => {
    return cy
      .fixture('e2e/modelCatalog/testSourceEnableDisable.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as ModelCatalogSourceTestData;

        cy.step('Verify Model Catalog backend resources are available');
        verifyModelCatalogBackend();

        cy.step('Ensure the Red Hat AI validated catalog source is enabled');
        return ensureModelCatalogSourceEnabled(testData.redhatAiSourceId2);
      });
  });

  it(
    'Tool calling labels, filter, and validated arguments card are displayed',
    { tags: ['@Dashboard', '@ModelCatalog', '@Featureflagged'] },
    () => {
      cy.step('Login as admin');
      cy.visitWithLogin('/', LDAP_ADMIN_USER);

      cy.step('Enable toolCalling feature flag');
      cy.window().then((win) => {
        win.sessionStorage.setItem('odh-feature-flags', '{"toolCalling":true}');
      });

      cy.step('Navigate to Model Catalog');
      modelCatalog.visit();

      cy.step('Wait for model catalog cards to appear');
      waitForModelCatalogCards();

      cy.step('Verify the Validated arguments filter section is present in the sidebar');
      modelCatalog.findValidatedArgumentsFilter().should('exist');

      cy.step('Select Tool calling in the Validated arguments filter');
      modelCatalog.findValidatedArgumentsFilterCheckbox().check();

      cy.step('Verify filtered results contain at least one model card');
      modelCatalog.findModelCatalogCards().should('have.length.at.least', 1);

      cy.step('Expand label overflow on first card and verify Tool calling has a success icon');
      modelCatalog.expandFirstCardLabelGroup();
      modelCatalog.findFirstCardLabelWithIcon(testData.toolCallingLabel).should('exist');
      modelCatalog.findValidatedTaskIcon().should('exist');

      cy.step('Navigate to the first filtered model details page');
      modelCatalog.findFirstModelCatalogCardLink().click();

      cy.step('Verify the details page loads');
      modelDetailsPage.findPageTitle().should('exist');

      cy.step('Expand the label overflow in Model details');
      modelDetailsPage.expandModelDetailsLabelGroup();

      cy.step('Verify the Tool calling label is visible on the details page');
      modelDetailsPage.findModelDetailsLabelByText(testData.toolCallingLabel).should('exist');

      cy.step('Verify the Validated arguments card is shown on the Overview tab');
      modelDetailsPage.findValidatedConfigurationsCard().scrollIntoView().should('be.visible');

      cy.step('Verify the Tool Calling expandable card is present');
      modelDetailsPage.findToolCallingCard().should('exist');

      cy.step('Expand the Tool Calling card');
      modelDetailsPage.findToolCallingToggle().click();

      cy.step('Verify deployment args are shown inside the expanded card');
      modelDetailsPage.findToolCallingCard().should('contain.text', testData.toolCallingArg);

      cy.step('Verify Validated deployment resources are displayed');
      modelDetailsPage.findValidatedDeploymentResourceLabels().should('have.length.at.least', 1);
    },
  );
});
