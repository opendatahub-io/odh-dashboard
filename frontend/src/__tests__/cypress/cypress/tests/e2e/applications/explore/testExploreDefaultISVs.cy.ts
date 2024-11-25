import { HTPASSWD_CLUSTER_ADMIN_USER } from "~/__tests__/cypress/cypress/utils/e2eUsers";
import { explorePage } from "~/__tests__/cypress/cypress/pages/explore";
import { getOcResourceNames } from "~/__tests__/cypress/cypress/utils/oc_commands/applications";

const applicationNamespace = Cypress.env('TEST_NAMESPACE');

describe('Verify RHODS Explore Section Contains Only Expected ISVs', () => {
  let expectedISVs: string[];

  before(() => {
    getOcResourceNames(applicationNamespace, 'OdhApplication').then((metadataNames) => {
      expectedISVs = metadataNames;
      cy.log(`Expected ISVs: ${expectedISVs.join(', ')}`);
    });
  });

  it('Validate that default ISVs display in the Explore Section', () => {
    cy.step('Login to the application');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

    cy.step('Navigate to the Explore page');
    explorePage.visit();

    //	locator('[data-testid="card aikit"] label')
  });
});