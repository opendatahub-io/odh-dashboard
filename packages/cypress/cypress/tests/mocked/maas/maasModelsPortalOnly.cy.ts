import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { appChrome } from '../../../pages/appChrome';
import { pageNotfound } from '../../../pages/pageNotFound';
import { asProductAdminUser } from '../../../utils/mockUsers';

describe('MaaS Models portal-only route', () => {
  it('should not expose the portal models page in RHOAI even when grid is enabled', () => {
    asProductAdminUser();
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({ genAiStudio: true, modelAsService: true, grid: true }),
    );
    cy.visitWithLogin('/maas/models');
    pageNotfound.findPage().should('be.visible');
    appChrome.findNavItem({ name: 'Models' }).should('not.exist');
    cy.testA11y();
  });
});
