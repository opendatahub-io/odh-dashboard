/* eslint-disable camelcase */
import { mockDashboardConfig, mockDscStatus } from '@odh-dashboard/internal/__mocks__';
import { mockDsciStatus } from '@odh-dashboard/internal/__mocks__/mockDsciStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import type { DashboardCommonConfig } from '@odh-dashboard/k8s-core';
import { modelCatalogSettings } from '../../../pages/modelCatalogSettings';
import { pageNotfound } from '../../../pages/pageNotFound';
import { asProductAdminUser, asProjectAdminUser } from '../../../utils/mockUsers';

const setupAdminMocks = (configOverrides: Partial<DashboardCommonConfig> = {}) => {
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
      ...configOverrides,
    }),
  );
  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/user',
    { path: { apiVersion: 'v1' } },
    { data: { userId: 'user@example.com', clusterAdmin: true } },
  );
};

it('Model catalog settings should not be available for non product admins', () => {
  asProjectAdminUser();
  modelCatalogSettings.visit(false);
  pageNotfound.findPage().should('exist');
  modelCatalogSettings.findNavItem().should('not.exist');
});

it('Model catalog settings should be available for product admins with capabilities', () => {
  setupAdminMocks();
  modelCatalogSettings.visit(true);
  modelCatalogSettings.findNavItem().should('exist');
});

it('Model catalog settings should not be available when model catalog is disabled', () => {
  setupAdminMocks({ disableModelCatalog: true });
  modelCatalogSettings.visit(false);
  pageNotfound.findPage().should('exist');
  modelCatalogSettings.findNavItem().should('not.exist');
});
