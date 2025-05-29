import { mockDashboardConfig } from '#~/__mocks__';
import { navSidebar } from './navSidebar';

describe('Nav Sidebar model section', () => {
  it('should show the models section', () => {
    navSidebar.visit();
    navSidebar.findNavSection('Models').should('exist');
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
    navSidebar.findNavSection('Models').should('not.exist');
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
    navSidebar.findNavSection('Models').should('exist');
    navSidebar.findNavItem('Model catalog', 'Models').should('exist');
    navSidebar.findNavItem('Model registry', 'Models').should('exist');
    navSidebar.findNavItem('Model deployments', 'Models').should('not.exist');
    navSidebar.findNavItem('Model customization', 'Models').should('not.exist');
  });
});
