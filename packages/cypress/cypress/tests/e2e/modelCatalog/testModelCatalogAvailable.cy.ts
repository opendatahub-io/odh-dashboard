import { HTPASSWD_CLUSTER_ADMIN_USER, LDAP_CONTRIBUTOR_USER } from '../../../utils/e2eUsers';
import { modelCatalog } from '../../../pages/modelCatalog/modelCatalog';
import { verifyModelCatalogBackend } from '../../../utils/oc_commands/modelCatalog';

describe('Verifies that Model Catalog is available for different users', () => {
  before(() => {
    cy.step('Verifies that Model Catalog pods, Services and ConfigMaps are available');
    verifyModelCatalogBackend();
  });

  it(
    'Verifies that Model Catalog is available for an admin user',
    { tags: ['@Smoke', '@SmokeSet1', '@Dashboard', '@ModelCatalog'] },
    () => {
      cy.step('Login as admin user');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Catalog');
      modelCatalog.navigate();

      cy.step('Check if Model Catalog content is displayed');
      modelCatalog.findModelCards().should('exist');
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

      cy.step('Check if Model Catalog content is displayed');
      modelCatalog.findModelCards().should('exist');
    },
  );
});
