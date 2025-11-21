/* eslint-disable camelcase */
import { mockDashboardConfig, mockDscStatus } from '@odh-dashboard/internal/__mocks__';
import { mockDsciStatus } from '@odh-dashboard/internal/__mocks__/mockDsciStatus';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { modelCatalogSettings } from '../../../pages/modelCatalogSettings';
import { pageNotfound } from '../../../pages/pageNotFound';
import { asProductAdminUser, asProjectAdminUser } from '../../../utils/mockUsers';

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
