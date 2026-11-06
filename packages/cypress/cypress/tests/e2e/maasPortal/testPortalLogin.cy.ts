import { maasPortalPage } from '../../../pages/maasPortal';
import { MAAS_PORTAL_USER } from '../../../utils/e2eUsers';

describe('MaaS Portal login', () => {
  it(
    'logs in through Keycloak and shows the Model endpoints navigation item',
    { tags: ['@Smoke', '@Dashboard', '@MaaS', '@MaaSPortal'] },
    () => {
      const portalUrl = Cypress.env('MAAS_PORTAL_URL') as string | undefined;

      if (!portalUrl) {
        throw new Error('MAAS_PORTAL_URL is not configured in CY_TEST_CONFIG');
      }

      if (!MAAS_PORTAL_USER) {
        throw new Error('MAAS_PORTAL_USER is not configured in CY_TEST_CONFIG');
      }

      cy.step('Open the MaaS Portal and complete the Keycloak login flow');
      maasPortalPage.visitWithLogin(portalUrl, MAAS_PORTAL_USER);

      cy.step('Verify that the MaaS Portal navigation is visible');
      maasPortalPage.findNavigation().should('be.visible');
      maasPortalPage.findNavLink('Model endpoints').should('be.visible');
    },
  );
});
