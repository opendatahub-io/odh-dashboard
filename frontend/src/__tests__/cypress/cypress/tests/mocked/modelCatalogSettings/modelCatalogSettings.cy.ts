/* eslint-disable camelcase */
import { mockDashboardConfig, mockDscStatus } from '#~/__mocks__';
import { mockDsciStatus } from '#~/__mocks__/mockDsciStatus';
import { DataScienceStackComponent } from '#~/concepts/areas/types';
import { modelCatalogSettings } from '#~/__tests__/cypress/cypress/pages/modelCatalogSettings';
import { pageNotfound } from '#~/__tests__/cypress/cypress/pages/pageNotFound';
import {
  asProductAdminUser,
  asProjectAdminUser,
} from '#~/__tests__/cypress/cypress/utils/mockUsers';

const setupMocksForMCSettingAccess = () => {
  asProductAdminUser();
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.MODEL_REGISTRY]: {
          managementState: 'Managed',
          registriesNamespace: 'odh-model-registries',
        },
      },
    }),
  );
  cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({}));
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelRegistry: false,
      disableModelCatalog: false,
      aiCatalogSettings: true,
    }),
  );
  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/user',
    { path: { apiVersion: 'v1' } },
    { data: { userId: 'user@example.com', clusterAdmin: true } },
  );
};

it('AI catalog settings should not be available for non product admins', () => {
  asProjectAdminUser();
  modelCatalogSettings.visit(false);
  pageNotfound.findPage().should('exist');
  modelCatalogSettings.findNavItem().should('not.exist');
});

it('AI catalog settings should be available for product admins with capabilities', () => {
  setupMocksForMCSettingAccess();
  // check page is accessible
  modelCatalogSettings.visit(true);
  // check nav item exists
  modelCatalogSettings.findNavItem().should('exist');
});
