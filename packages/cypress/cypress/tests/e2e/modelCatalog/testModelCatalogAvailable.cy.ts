import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER, LDAP_CONTRIBUTOR_USER } from '../../../utils/e2eUsers';
import { modelCatalog } from '../../../pages/modelCatalog/modelCatalog';
import {
  verifyModelCatalogBackend,
  ensureModelCatalogSourceEnabled,
  waitForModelCatalogCards,
} from '../../../utils/oc_commands/modelCatalog';
import { retryableBefore } from '../../../utils/retryableHooks';
import type { ModelCatalogSourceTestData } from '../../../types';

describe('Verifies that Model Catalog is available for different users', () => {
  let testData: ModelCatalogSourceTestData;

  retryableBefore(() => {
    return cy
      .fixture('e2e/modelCatalog/testSourceEnableDisable.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as ModelCatalogSourceTestData;

        cy.step('Verifies that Model Catalog pods, Services and ConfigMaps are available');
        verifyModelCatalogBackend();

        cy.step('Ensure at least one model catalog source is enabled');
        return ensureModelCatalogSourceEnabled(testData.redhatAiSourceId);
      });
  });

  it(
    'Verifies that Model Catalog is available for an admin user',
    { tags: ['@Smoke', '@SmokeSet1', '@Dashboard', '@ModelCatalog', '@NonConcurrent'] },
    () => {
      cy.step('Login as admin user');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Catalog');
      modelCatalog.navigate();

      cy.step('Wait for model catalog cards to appear');
      waitForModelCatalogCards();

      cy.step('Check if Model Catalog content is displayed');
      modelCatalog.findModelCatalogCards().should('exist');
    },
  );

  it(
    'Verifies that Model Catalog is available for a regular user',
    { tags: ['@Smoke', '@SmokeSet1', '@Dashboard', '@ModelCatalog'] },
    () => {
      cy.step('Login as LDAP user');
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      cy.step('Navigate to Model Catalog');
      modelCatalog.navigate();

      cy.step('Wait for model catalog cards to appear');
      waitForModelCatalogCards();

      cy.step('Check if Model Catalog content is displayed');
      modelCatalog.findModelCatalogCards().should('exist');
    },
  );
});
