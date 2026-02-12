import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { modelCatalogSettings } from '../../../pages/modelCatalogSettings';
import { modelCatalog } from '../../../pages/modelCatalog/modelCatalog';
import {
  verifyModelCatalogSourceEnabled,
  waitForModelCatalogCards,
  waitForModelCatalogEmptyState,
  enableModelCatalogSource,
} from '../../../utils/oc_commands/modelCatalog';
import { retryableBefore } from '../../../utils/retryableHooks';
import type { ModelCatalogSourceTestData } from '../../../types';

describe('Verify Model Catalog Source Enable/Disable', () => {
  let testData: ModelCatalogSourceTestData;

  retryableBefore(() => {
    return cy
      .fixture('e2e/modelCatalog/testSourceEnableDisable.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as ModelCatalogSourceTestData;
      });
  });

  after(() => {
    cy.step('Re-enable model catalog sources via configmap');
    enableModelCatalogSource(testData.redhatAiSourceId);
    enableModelCatalogSource(testData.redhatAiSourceId2);
  });

  it(
    'Admin can enable and disable model catalog sources',
    { tags: ['@Sanity', '@SanitySet4', '@Dashboard', '@ModelCatalog', '@NonConcurrent'] },
    () => {
      cy.step('Log into the application as admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to AI catalog sources');
      modelCatalogSettings.navigate();

      cy.step('Verify configmap shows source as enabled');
      verifyModelCatalogSourceEnabled(testData.redhatAiSourceId, true);

      cy.step('Navigate to catalog');
      modelCatalog.navigate();

      cy.step('Wait for model catalog cards to appear');
      waitForModelCatalogCards();

      cy.step('Verify model catalog cards are visible');
      modelCatalog.findModelCatalogCards().should('exist');

      cy.step('Navigate back to AI catalog sources');
      modelCatalogSettings.navigate();

      cy.step(`Disable the ${testData.sourceName} source`);
      modelCatalogSettings.findEnableToggle(testData.redhatAiSourceId).click({ force: true });

      cy.step(`Disable the ${testData.sourceName2} source`);
      modelCatalogSettings.findEnableToggle(testData.redhatAiSourceId2).click({ force: true });

      cy.step('Verify configmap shows source as disabled');
      verifyModelCatalogSourceEnabled(testData.redhatAiSourceId, false);

      cy.step('Navigate to catalog');
      modelCatalog.navigate();

      cy.step('Wait for model catalog to show empty state');
      waitForModelCatalogEmptyState();

      cy.step('Verify model catalog shows empty state');
      modelCatalog.findModelCatalogEmptyState().should('exist');
    },
  );
});
