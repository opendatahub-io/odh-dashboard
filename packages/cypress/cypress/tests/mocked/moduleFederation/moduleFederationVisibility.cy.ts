import {
  mockDashboardConfig,
  type MockDashboardConfigType,
} from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import {
  mockDscStatus,
  type MockDscStatus,
} from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { pageNotfound } from '../../../pages/pageNotFound';
import { homePage } from '../../../pages/home/home';
import { autoragConfigurePage } from '../../../pages/autorag/configurePage';
import { navSidebar } from '../navSidebar/navSidebar';
import { automlExperimentsPage } from '../../../pages/automl/experimentsPage';
import { appChrome } from '../../../pages/appChrome';

// Applied via .invoke('text').should('not.match', ...) — chai's contain.text does substring
// matching only and silently passes any regex through, so it cannot be used here.
const PREVIEW_LABEL_REGEX = /Tech\s+Preview|Technology\s+Preview|Dev\s+Preview/i;

const initIntercepts = (
  config: Partial<MockDashboardConfigType>,
  components?: MockDscStatus['components'],
  conditions?: MockDscStatus['conditions'],
) => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig(config));
  if (components) {
    cy.interceptOdh('GET /api/dsc/status', mockDscStatus({ components, conditions }));
  }
};

describe('Module federation visibility', () => {
  describe('Module present — nav and route accessible', () => {
    it('should show Data Registry navigation when enabled and ready while Feature Store is Removed', () => {
      initIntercepts(
        { dataRegistry: true },
        {
          [DataScienceStackComponent.FEATURE_STORE]: { managementState: 'Removed' },
          [DataScienceStackComponent.DATA_REGISTRY]: { managementState: 'Managed' },
        },
      );

      navSidebar.visit();
      navSidebar.findNavItem({ name: 'Data', rootSection: 'AI hub' }).should('exist');
    });

    it('should show AutoML nav and render route with the GA default', () => {
      initIntercepts(
        {},
        { [DataScienceStackComponent.DS_PIPELINES]: { managementState: 'Managed' } },
      );
      navSidebar.visit();
      navSidebar
        .findNavItem({ name: 'AutoML', rootSection: 'Develop & train' })
        .should('exist')
        .invoke('text')
        .should('not.match', PREVIEW_LABEL_REGEX);
      cy.visitWithLogin('/develop-train/automl');
      pageNotfound.findPage().should('not.exist');
      // The lazy route's loading fallback is empty, so negative assertions can pass against
      // the shell before AutoML content mounts — wait for the module header first, and scope
      // the text check to the main content region so unrelated host content cannot affect it.
      automlExperimentsPage.findModuleHeaderIconContainer().should('exist');
      appChrome.findMainContent().invoke('text').should('not.match', PREVIEW_LABEL_REGEX);
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

    it('should show AutoRAG navigation and task shortcuts without preview labels', () => {
      initIntercepts(
        { genAiStudio: true },
        { [DataScienceStackComponent.DS_PIPELINES]: { managementState: 'Managed' } },
      );

      navSidebar.visit();
      navSidebar
        .findNavItem({ name: 'AutoRAG', rootSection: 'Gen AI studio' })
        .should('exist')
        .invoke('text')
        .should('not.match', PREVIEW_LABEL_REGEX);

      homePage.visit();
      homePage
        .findTaskShortcut('genai-autorag')
        .should('be.visible')
        .invoke('text')
        .should('not.match', PREVIEW_LABEL_REGEX);

      autoragConfigurePage.visit('test-project');
      autoragConfigurePage.findPageTitle().should('exist');
      autoragConfigurePage.findPageBody().invoke('text').should('not.match', PREVIEW_LABEL_REGEX);
    });

    it('should show Feature store section and render route when flag and DSC are enabled', () => {
      initIntercepts(
        { disableFeatureStore: false },
        {
          [DataScienceStackComponent.FEATURE_STORE]: { managementState: 'Managed' },
          [DataScienceStackComponent.DATA_REGISTRY]: { managementState: 'Removed' },
        },
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
    it('should hide Data Registry navigation and route while the shared operator is not ready', () => {
      initIntercepts(
        { dataRegistry: true },
        {
          [DataScienceStackComponent.FEATURE_STORE]: { managementState: 'Managed' },
          [DataScienceStackComponent.DATA_REGISTRY]: { managementState: 'Managed' },
        },
        [{ type: 'FeastOperatorReady', status: 'False' }],
      );

      navSidebar.visit();
      navSidebar.findNavItem({ name: 'Data', rootSection: 'AI hub' }).should('not.exist');
      cy.visitWithLogin('/ai-hub/data');
      pageNotfound.findPage().should('exist');
    });

    it('should hide Data Registry navigation and route when its lifecycle is Removed', () => {
      initIntercepts(
        { dataRegistry: true },
        {
          [DataScienceStackComponent.FEATURE_STORE]: { managementState: 'Managed' },
          [DataScienceStackComponent.DATA_REGISTRY]: { managementState: 'Removed' },
        },
      );

      navSidebar.visit();
      navSidebar.findNavItem({ name: 'Data', rootSection: 'AI hub' }).should('not.exist');
      cy.visitWithLogin('/ai-hub/data');
      pageNotfound.findPage().should('exist');
    });

    it('should hide AutoML nav and show 404 on route when flag is disabled', () => {
      // The MF host loads remoteEntry.js and extensions for every remote regardless of feature
      // flags — flag filtering happens after load — so only the module's API requests are
      // meaningful to assert on here.
      cy.intercept({ pathname: '/automl/api/**' }, { statusCode: 404 }).as('automlApiRequests');
      initIntercepts({ automl: false });
      navSidebar.visit();
      navSidebar
        .findNavItem({ name: 'AutoML', rootSection: 'Develop & train' })
        .should('not.exist');
      cy.visitWithLogin('/develop-train/automl');
      pageNotfound.findPage().should('exist');
      cy.get('@automlApiRequests.all').should('have.length', 0);
    });

    it('should hide Gen AI studio section and show 404 on route when flag is disabled', () => {
      initIntercepts({ genAiStudio: false });
      navSidebar.visit();
      navSidebar.findNavSection('Gen AI studio').should('not.exist');
      cy.visitWithLogin('/gen-ai-studio');
      pageNotfound.findPage().should('exist');
    });

    it('should hide AutoRAG nav and show 404 on route when flag is disabled', () => {
      // The MF host loads remoteEntry.js and extensions for every remote regardless of feature
      // flags — flag filtering happens after load — so only the module's API requests are
      // meaningful to assert on here.
      cy.intercept({ pathname: '/autorag/api/**' }, { statusCode: 404 }).as('autoragApiRequests');
      initIntercepts(
        { autorag: false, genAiStudio: true },
        { [DataScienceStackComponent.DS_PIPELINES]: { managementState: 'Managed' } },
      );

      navSidebar.visit();
      navSidebar.findNavItem({ name: 'AutoRAG', rootSection: 'Gen AI studio' }).should('not.exist');
      // AutoRAG's route sits under the Gen AI studio catch-all (/gen-ai-studio/*) owned by the
      // gen-ai remote — with the AutoRAG route filtered out, the URL falls through to gen-ai's
      // own not-found page rather than the host's, so assert on the AutoRAG page not rendering.
      cy.visitWithLogin('/gen-ai-studio/autorag/configure/test-project');
      autoragConfigurePage.findPageTitle().should('not.exist');
      autoragConfigurePage.findPageBody().should('contain.text', '404 Page not found');
      cy.get('@autoragApiRequests.all').should('have.length', 0);
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

    it('should hide Feature store browse and admin routes while the shared operator is not ready', () => {
      initIntercepts(
        { disableFeatureStore: false, featureStoreAdmin: true },
        {
          [DataScienceStackComponent.FEATURE_STORE]: { managementState: 'Managed' },
          [DataScienceStackComponent.DATA_REGISTRY]: { managementState: 'Managed' },
        },
        [{ type: 'FeastOperatorReady', status: 'False' }],
      );

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
      cy.visitWithLogin('/settings/environment-setup/feature-stores');
      pageNotfound.findPage().should('exist');
    });

    it('should hide Feature store browse and admin routes when its lifecycle is Removed', () => {
      initIntercepts(
        { disableFeatureStore: false, featureStoreAdmin: true },
        {
          [DataScienceStackComponent.FEATURE_STORE]: { managementState: 'Removed' },
          [DataScienceStackComponent.DATA_REGISTRY]: { managementState: 'Managed' },
        },
      );

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
      cy.visitWithLogin('/settings/environment-setup/feature-stores');
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
