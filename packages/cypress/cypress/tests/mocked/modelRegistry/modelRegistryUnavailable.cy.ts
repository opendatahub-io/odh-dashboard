import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockDsciStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDsciStatus';
import {
  mockModelRegistry,
  mockModelRegistryService,
} from '@odh-dashboard/internal/__mocks__/mockModelRegistryService';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { unavailableModelRegistryPage } from '../../../pages/modelRegistry/unavailableModelRegistryPage';
import { ServiceModel } from '../../../utils/models';
import { asClusterAdminUser, asProjectEditUser } from '../../../utils/mockUsers';

const MODEL_REGISTRY_API_VERSION = 'v1';
const UNAVAILABLE_REGISTRY_NAME = 'unavailable-registry';
const UNAVAILABLE_REGISTRY_DISPLAY_NAME = 'Unavailable Registry';
const REGISTRY_SETTINGS_URL = '/settings/model-resources-operations/model-registry';

const initIntercepts = () => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelRegistry: false,
    }),
  );
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
  cy.interceptK8sList(
    ServiceModel,
    mockK8sResourceList([mockModelRegistryService({ name: UNAVAILABLE_REGISTRY_NAME })]),
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/namespaces`,
    { path: { apiVersion: MODEL_REGISTRY_API_VERSION } },
    { data: [{ metadata: { name: 'odh-model-registries' } }] },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/user`,
    { path: { apiVersion: MODEL_REGISTRY_API_VERSION } },
    { data: { userId: 'user@example.com', clusterAdmin: false } },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry`,
    { path: { apiVersion: MODEL_REGISTRY_API_VERSION } },
    {
      data: [
        mockModelRegistry({
          name: UNAVAILABLE_REGISTRY_NAME,
          displayName: UNAVAILABLE_REGISTRY_DISPLAY_NAME,
          isAvailable: false,
        }),
      ],
    },
  );
};

describe('Model Registry Unavailable State', () => {
  it('Admin user sees admin-specific unavailable messaging', () => {
    asClusterAdminUser();
    initIntercepts();

    unavailableModelRegistryPage.visit(UNAVAILABLE_REGISTRY_NAME);

    cy.contains('Model registry unavailable').should('be.visible');
    cy.contains(
      `The ${UNAVAILABLE_REGISTRY_DISPLAY_NAME} registry is currently unavailable. Check the registry configuration in settings to troubleshoot the issue.`,
    ).should('be.visible');
    unavailableModelRegistryPage
      .findSettingsLink()
      .should('be.visible')
      .and('have.attr', 'href', REGISTRY_SETTINGS_URL);
    unavailableModelRegistryPage.findWhosMyAdminLink().should('not.exist');
  });

  it('Non-admin user sees non-admin unavailable messaging', () => {
    asProjectEditUser();
    initIntercepts();

    unavailableModelRegistryPage.visit(UNAVAILABLE_REGISTRY_NAME);

    cy.contains('Model registry unavailable').should('be.visible');
    cy.contains(
      `The ${UNAVAILABLE_REGISTRY_DISPLAY_NAME} registry is currently unavailable. It might still be starting up, or there might be a configuration error. Wait a few minutes and try again. If the problem persists, contact your administrator.`,
    ).should('be.visible');
    unavailableModelRegistryPage.findWhosMyAdminLink().should('be.visible').click();
    cy.contains('Your administrator might be:').should('be.visible');
    unavailableModelRegistryPage.findSettingsLink().should('not.exist');
  });
});
