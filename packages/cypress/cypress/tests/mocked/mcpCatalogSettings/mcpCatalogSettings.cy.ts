/* eslint-disable camelcase */
import { mockDashboardConfig, mockDscStatus } from '@odh-dashboard/internal/__mocks__';
import { mockDsciStatus } from '@odh-dashboard/internal/__mocks__/mockDsciStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import type { DashboardCommonConfig } from '@odh-dashboard/k8s-core';
import { mcpCatalogSettings } from '../../../pages/mcpCatalogSettings';
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
      mcpCatalog: true,
      ...configOverrides,
    }),
  );
  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/user',
    { path: { apiVersion: 'v1' } },
    { data: { userId: 'user@example.com', clusterAdmin: true } },
  );
};

describe('MCP Catalog Settings', () => {
  it('MCP catalog settings should not be available for non product admins', () => {
    asProjectAdminUser();
    mcpCatalogSettings.visit(false);
    pageNotfound.findPage().should('exist');
    mcpCatalogSettings.findNavItem().should('not.exist');
  });

  it('MCP catalog settings should be available for product admins with mcpCatalog enabled', () => {
    setupAdminMocks();
    mcpCatalogSettings.visit(true);
    mcpCatalogSettings.findNavItem().should('exist');
  });

  it('MCP catalog settings should not be available when mcpCatalog is disabled', () => {
    setupAdminMocks({ mcpCatalog: false });
    mcpCatalogSettings.visit(false);
    pageNotfound.findPage().should('exist');
    mcpCatalogSettings.findNavItem().should('not.exist');
  });
});
