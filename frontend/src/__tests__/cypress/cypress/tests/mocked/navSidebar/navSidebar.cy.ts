import { mockDashboardConfig } from '#~/__mocks__';
import { navSidebar } from './navSidebar';

describe('Nav Sidebar model section', () => {
  it('should show the models section', () => {
    navSidebar.visit();
    navSidebar.findNavSection('AI hub').should('exist');
  });

  it('should not show the models section if all the related feature flags are disabled', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableModelCatalog: true,
        disableModelRegistry: true,
        disableModelServing: true,
        disableFineTuning: true,
      }),
    );
    navSidebar.visit();
    navSidebar.findNavSection('AI hub').should('not.exist');
  });

  it('should show the models section if some of the related feature flags are enabled', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableModelCatalog: false,
        disableModelRegistry: false,
        disableModelServing: true,
        disableFineTuning: true,
      }),
    );
    navSidebar.visit();
    navSidebar.findNavSection('AI hub').should('exist');
    navSidebar.findNavItem({ name: 'Catalog', rootSection: 'AI hub' }).should('exist');
    navSidebar.findNavItem({ name: 'Registry', rootSection: 'AI hub' }).should('exist');
    navSidebar.findNavItem({ name: 'Deployments', rootSection: 'AI hub' }).should('not.exist');
  });
});
