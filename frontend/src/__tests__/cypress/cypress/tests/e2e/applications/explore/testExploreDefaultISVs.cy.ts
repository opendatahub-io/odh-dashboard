import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { explorePage } from '~/__tests__/cypress/cypress/pages/explore';
import { getOcResourceNames } from '~/__tests__/cypress/cypress/utils/oc_commands/applications';

const applicationNamespace = Cypress.env('TEST_NAMESPACE');

describe('Verify RHODS Explore Section Contains Only Expected ISVs', () => {
  let expectedISVs: string[];

  before(() => {
    // Setup: Retrieve the names of OdhApplication resources in the specified namespace.
    getOcResourceNames(applicationNamespace, 'OdhApplication').then((metadataNames) => {
      // Filter out the 'rhoai' card from the expected ISVs which displays in RHOAI
      expectedISVs = metadataNames.filter((isv) => isv !== 'rhoai');
      cy.log(`Expected ISVs (excluding 'rhoai'): ${expectedISVs.join(', ')}`);
    });
  });

  it('Validate that default ISVs display in the Explore Section', () => {
    // Authentication and navigation
    cy.step('Login to the application');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

    // Navigate to the Explore page and search for each ISV.
    cy.step('Navigate to the Explore page');
    explorePage.visit();

    cy.step('Searching for each ISV based on the oc command output');
    expectedISVs.forEach((isv) => {
      explorePage
        .findCardLocator(isv)
        .should('be.visible')
        .then(() => {
          cy.log(`✅ Application found: ${isv}`);
        });
    });
  });
});
