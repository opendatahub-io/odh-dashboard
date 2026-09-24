import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockDsciStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDsciStatus';
import {
  mockModelRegistry,
  mockModelRegistryService,
} from '@odh-dashboard/internal/__mocks__/mockModelRegistryService';
import { mockRegisteredModelList } from '@odh-dashboard/internal/__mocks__/mockRegisteredModelsList';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { modelRegistry } from '../../../pages/modelRegistry';
import { ServiceModel } from '../../../utils/models';
import { asClusterAdminUser, asProjectEditUser } from '../../../utils/mockUsers';

const MODEL_REGISTRY_API_VERSION = 'v1';
const REGISTRY_SETTINGS_URL = '/settings/model-resources-operations/model-registry';

const initCommon = () => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ disableModelRegistry: false }));
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
    mockK8sResourceList([mockModelRegistryService({ name: 'modelregistry-sample' })]),
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
};

// No registries -> empty-model-registries-state (OdhModelRegistryCoreLoader.createEmptyStatePage)
const initNoRegistries = () => {
  initCommon();
  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry`,
    { path: { apiVersion: MODEL_REGISTRY_API_VERSION } },
    { data: [] },
  );
};

// One registry -> selector toolbar renders AdminHelpAction ("Need another registry?")
const initWithRegistry = () => {
  initCommon();
  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry`,
    { path: { apiVersion: MODEL_REGISTRY_API_VERSION } },
    { data: [mockModelRegistry({ name: 'modelregistry-sample' })] },
  );
  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models`,
    { path: { modelRegistryName: 'modelregistry-sample', apiVersion: MODEL_REGISTRY_API_VERSION } },
    { data: mockRegisteredModelList({ items: [] }) },
  );
};

describe('AdminHelpAction - admin vs non-admin messaging', () => {
  describe('No registries available (empty state)', () => {
    it('admin sees the settings link and no WhosMyAdministrator', () => {
      asClusterAdminUser();
      initNoRegistries();
      modelRegistry.visitEmptyState();

      cy.findByTestId('empty-model-registries-state').should('be.visible');
      cy.findByTestId('empty-model-registries-state').within(() => {
        cy.findByTestId('model-registry-settings-link')
          .should('be.visible')
          .and('have.attr', 'href', REGISTRY_SETTINGS_URL);
      });
      cy.findByTestId('whos-my-admin-link').should('not.exist');
    });

    it('should show request-access description and no Settings link', () => {
      asProjectEditUser();
      initNoRegistries();

      modelRegistry.visitEmptyState();

      cy.findByTestId('empty-model-registries-state', { timeout: 10000 })
        .should('be.visible')
        .and(
          'contain.text',
          'To request a new model registry, or to request permission to access an existing model registry, contact your administrator',
        );

      cy.findByTestId('empty-model-registries-state').within(() => {
        cy.findByTestId('model-registry-settings-link').should('not.exist');
        cy.findByTestId('whos-my-admin-link').should('exist');
      });
    });
  });

  describe('Registry available (selector "Need another registry?")', () => {
    it('admin sees "create a new model registry" content with settings link', () => {
      asClusterAdminUser();
      initWithRegistry();
      modelRegistry.visit();

      modelRegistry.shouldModelRegistrySelectorExist();
      modelRegistry.findHelpContentButton().should('be.visible').click();

      modelRegistry
        .findHelpContentPopover()
        .should('be.visible')
        .and('contain.text', 'To create a new model registry');
      modelRegistry.findHelpContentPopover().within(() => {
        cy.findByTestId('model-registry-settings-link')
          .should('be.visible')
          .and('have.attr', 'href', REGISTRY_SETTINGS_URL);
      });
    });

    it('non-admin sees "contact your administrator" content with no settings link', () => {
      asProjectEditUser();
      initWithRegistry();
      modelRegistry.visit();

      modelRegistry.shouldModelRegistrySelectorExist();
      modelRegistry.findHelpContentButton().should('be.visible').click();

      modelRegistry
        .findHelpContentPopover()
        .should('be.visible')
        .and('contain.text', 'contact your administrator');
      modelRegistry.findHelpContentPopover().within(() => {
        cy.findByTestId('model-registry-settings-link').should('not.exist');
      });
    });
  });
});
