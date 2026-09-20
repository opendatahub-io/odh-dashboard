import {
  mockDashboardConfig,
  type MockDashboardConfigType,
} from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { pageNotfound } from '../../../pages/pageNotFound';
import { navSidebar } from '../navSidebar/navSidebar';

const initIntercepts = (
  config: Partial<MockDashboardConfigType>,
  components?: Record<string, { managementState: string }>,
) => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig(config));
  if (components) {
    cy.interceptOdh('GET /api/dsc/status', mockDscStatus({ components }));
  }
};

describe('Module federation visibility', () => {
  describe('Module present — nav and route accessible', () => {
    it('should show AutoML nav and render route when flag and DSC are enabled', () => {
      initIntercepts(
        { automl: true },
        { [DataScienceStackComponent.DS_PIPELINES]: { managementState: 'Managed' } },
      );
      navSidebar.visit();
      navSidebar.findNavItem({ name: 'AutoML', rootSection: 'Develop & train' }).should('exist');
      cy.visitWithLogin('/develop-train/automl');
      pageNotfound.findPage().should('not.exist');
    });

    it('should show Gen AI studio section and render route when flag is enabled', () => {
      initIntercepts({ genAiStudio: true });
      navSidebar.visit();
      navSidebar.findNavSection('Gen AI studio').should('exist');
      navSidebar
        .findNavItem({ name: 'AI asset endpoints', rootSection: 'Gen AI studio' })
        .should('exist');
      cy.visitWithLogin('/gen-ai-studio');
      pageNotfound.findPage().should('not.exist');
    });

    it('should show Feature store section and render route when flag and DSC are enabled', () => {
      initIntercepts(
        { disableFeatureStore: false },
        { [DataScienceStackComponent.FEAST_OPERATOR]: { managementState: 'Managed' } },
      );
      navSidebar.visit();
      navSidebar
        .findNavItem({
          name: 'Feature views',
          rootSection: 'Develop & train',
          subSection: 'Feature store',
        })
        .should('exist');
      cy.visitWithLogin('/develop-train/feature-store');
      pageNotfound.findPage().should('not.exist');
    });
  });

  describe('Module absent — nav hidden and route shows not-found', () => {
    it('should hide AutoML nav and show 404 on route when flag is disabled', () => {
      initIntercepts({ automl: false });
      navSidebar.visit();
      navSidebar
        .findNavItem({ name: 'AutoML', rootSection: 'Develop & train' })
        .should('not.exist');
      cy.visitWithLogin('/develop-train/automl');
      pageNotfound.findPage().should('exist');
    });

    it('should hide Gen AI studio section and show 404 on route when flag is disabled', () => {
      initIntercepts({ genAiStudio: false });
      navSidebar.visit();
      navSidebar.findNavSection('Gen AI studio').should('not.exist');
      cy.visitWithLogin('/gen-ai-studio');
      pageNotfound.findPage().should('exist');
    });

    it('should hide Feature store section and show 404 on route when flag is disabled', () => {
      initIntercepts({ disableFeatureStore: true });
      navSidebar.visit();
      navSidebar
        .findNavItem({
          name: 'Feature views',
          rootSection: 'Develop & train',
          subSection: 'Feature store',
        })
        .should('not.exist');
      cy.visitWithLogin('/develop-train/feature-store');
      pageNotfound.findPage().should('exist');
    });
  });

  describe('Mixed state — some modules present, others absent', () => {
    it('should show enabled modules and hide disabled ones simultaneously', () => {
      initIntercepts({
        genAiStudio: true,
        automl: false,
        disableFeatureStore: true,
      });
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
