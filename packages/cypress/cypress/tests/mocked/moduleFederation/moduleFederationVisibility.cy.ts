import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { pageNotfound } from '../../../pages/pageNotFound';
import { navSidebar } from '../navSidebar/navSidebar';

describe('Module federation visibility', () => {
  describe('Module present — nav and route accessible', () => {
    it('should show AutoML nav item when feature flag and DSC component are enabled', () => {
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          automl: true,
        }),
      );
      cy.interceptOdh(
        'GET /api/dsc/status',
        mockDscStatus({
          components: {
            [DataScienceStackComponent.DS_PIPELINES]: { managementState: 'Managed' },
          },
        }),
      );
      navSidebar.visit();
      navSidebar.findNavItem({ name: 'AutoML', rootSection: 'Develop & train' }).should('exist');
    });

    it('should show Gen AI studio section when feature flag is enabled', () => {
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          genAiStudio: true,
        }),
      );
      navSidebar.visit();
      navSidebar.findNavSection('Gen AI studio').should('exist');
      navSidebar
        .findNavItem({ name: 'AI asset endpoints', rootSection: 'Gen AI studio' })
        .should('exist');
    });

    it('should show Feature store section when feature flag and DSC component are enabled', () => {
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disableFeatureStore: false,
        }),
      );
      cy.interceptOdh(
        'GET /api/dsc/status',
        mockDscStatus({
          components: {
            [DataScienceStackComponent.FEAST_OPERATOR]: { managementState: 'Managed' },
          },
        }),
      );
      navSidebar.visit();
      navSidebar
        .findNavItem({
          name: 'Feature views',
          rootSection: 'Develop & train',
          subSection: 'Feature store',
        })
        .should('exist');
    });
  });

  describe('Module absent — nav hidden and route shows not-found', () => {
    it('should hide AutoML nav item when feature flag is disabled', () => {
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          automl: false,
        }),
      );
      navSidebar.visit();
      navSidebar
        .findNavItem({ name: 'AutoML', rootSection: 'Develop & train' })
        .should('not.exist');
    });

    it('should show 404 when navigating to AutoML route with flag disabled', () => {
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          automl: false,
        }),
      );
      cy.visitWithLogin('/develop-train/automl');
      pageNotfound.findPage().should('exist');
    });

    it('should hide Gen AI studio section when feature flag is disabled', () => {
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          genAiStudio: false,
        }),
      );
      navSidebar.visit();
      navSidebar.findNavSection('Gen AI studio').should('not.exist');
    });

    it('should show 404 when navigating to Gen AI route with flag disabled', () => {
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          genAiStudio: false,
        }),
      );
      cy.visitWithLogin('/gen-ai-studio');
      pageNotfound.findPage().should('exist');
    });

    it('should hide Feature store section when feature flag is disabled', () => {
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          disableFeatureStore: true,
        }),
      );
      navSidebar.visit();
      navSidebar
        .findNavItem({
          name: 'Feature views',
          rootSection: 'Develop & train',
          subSection: 'Feature store',
        })
        .should('not.exist');
    });
  });

  describe('Mixed state — some modules present, others absent', () => {
    it('should show enabled modules and hide disabled ones simultaneously', () => {
      cy.interceptOdh(
        'GET /api/config',
        mockDashboardConfig({
          genAiStudio: true,
          automl: false,
          disableFeatureStore: true,
        }),
      );
      navSidebar.visit();
      navSidebar.findNavSection('Gen AI studio').should('exist');
      navSidebar
        .findNavItem({ name: 'AutoML', rootSection: 'Develop & train' })
        .should('not.exist');
      navSidebar
        .findNavItem({
          name: 'Feature views',
          rootSection: 'Develop & train',
          subSection: 'Feature store',
        })
        .should('not.exist');
    });
  });
});
