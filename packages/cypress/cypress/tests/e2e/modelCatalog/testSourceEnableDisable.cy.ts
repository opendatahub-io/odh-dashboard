import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { modelCatalogSettings } from '../../../pages/modelCatalogSettings';
import { modelCatalog } from '../../../pages/modelCatalog/modelCatalog';
import {
  verifyModelCatalogSourceEnabled,
  waitForModelCatalogCards,
  waitForModelCatalogAfterDisable,
  enableModelCatalogSource,
} from '../../../utils/oc_commands/modelCatalog';
import { retryableBefore } from '../../../utils/retryableHooks';
import type { ModelCatalogSourceTestData } from '../../../types';

describe('Verify Model Catalog Source Enable/Disable', () => {
  let testData: ModelCatalogSourceTestData;
  const getSources = () => [
    { name: testData.validatedSourceName, id: testData.validatedSourceId },
    { name: testData.otherSourceName, id: testData.otherSourceId },
  ];

  retryableBefore(() => {
    return cy
      .fixture('e2e/modelCatalog/testSourceEnableDisable.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as ModelCatalogSourceTestData;
      })
      .then(() => {
        getSources().forEach(({ id }) => {
          enableModelCatalogSource(id);
          verifyModelCatalogSourceEnabled(id, true);
        });
      });
  });

  after(() => {
    cy.step('Re-enable model catalog sources via configmap');
    getSources().forEach(({ id }) => enableModelCatalogSource(id));
  });

  it(
    'Admin can enable and disable model catalog sources',
    { tags: ['@Sanity', '@SanitySet4', '@Dashboard', '@ModelCatalog', '@NonConcurrent'] },
    () => {
      cy.step('Log into the application as admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model catalog settings');
      modelCatalogSettings.visit();

      cy.step('Verify configmap shows sources as enabled');
      getSources().forEach(({ id }) => verifyModelCatalogSourceEnabled(id, true));

      cy.step('Navigate to catalog');
      modelCatalog.visit();

      cy.step('Wait for model catalog cards to appear');
      waitForModelCatalogCards();

      cy.step('Verify model catalog cards are visible');
      modelCatalog.findModelCatalogCards().should('exist');

      cy.step('Navigate back to Model catalog settings');
      modelCatalogSettings.visit();

      getSources().forEach(({ name, id }) => {
        cy.step(`Disable the ${name} source`);
        modelCatalogSettings.findEnableToggle(id).click({ force: true });
        cy.step(`Verify the ${name} source is disabled in configmap`);
        verifyModelCatalogSourceEnabled(id, false);
      });

      cy.step('Navigate to catalog');
      modelCatalog.visit();

      cy.step('Wait for catalog to reflect disabled sources');
      waitForModelCatalogAfterDisable(getSources().map(({ id }) => id));
    },
  );
});
