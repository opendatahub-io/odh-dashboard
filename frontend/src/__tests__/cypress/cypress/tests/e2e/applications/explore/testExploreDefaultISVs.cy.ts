import { HTPASSWD_CLUSTER_ADMIN_USER } from "~/__tests__/cypress/cypress/utils/e2eUsers";
import { explorePage } from "~/__tests__/cypress/cypress/pages/explore";


describe('Verify RHODS Explore Section Contains Only Expected ISVs', () => {
    it('Validate that default ISVs display in the Explore Section', () => {
        cy.step('Login to the application');
        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

        cy.step('Navigate to the Explore page');
        explorePage.visit();
    });
});