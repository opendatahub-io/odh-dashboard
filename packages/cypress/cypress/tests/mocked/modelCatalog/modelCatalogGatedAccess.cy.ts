/* eslint-disable camelcase */
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockAIHubNamespaceResponse } from '@odh-dashboard/k8s-core/__mocks__/mockAIHub';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { ModelRegistryMetadataType } from '@odh-dashboard/model-registry/types/types';
import { asClusterAdminUser, asProjectEditUser } from '../../../utils/mockUsers';
import { modelDetailsPage } from '../../../pages/modelCatalog/modelDetailsPage';
import { API_VERSION, setupModelCatalogIntercepts } from '../catalogHelpers';

const SOURCE_ID = 'hugging_face_source';
const MODEL_NAME = 'meta-llama/Llama-3.1-8B-Instruct-INT8';
const ENCODED_MODEL_NAME = 'meta-llama%2FLlama-3.1-8B-Instruct-INT8';
const REGISTRIES_NAMESPACE = 'team-a-model-registry';

const gatedDeniedModel = {
  source_id: SOURCE_ID,
  name: MODEL_NAME,
  description: 'Gated model details remain visible after upstream #3309.',
  readme: '# Llama gated model',
  provider: 'Meta',
  license: 'apache-2.0',
  tasks: ['text-generation'],
  customProperties: {
    hf_access_type: {
      string_value: 'gated_auto',
      metadataType: ModelRegistryMetadataType.STRING,
    },
    hf_gated_access_granted: {
      string_value: 'false',
      metadataType: ModelRegistryMetadataType.STRING,
    },
  },
};

type GatedAccessInterceptOptions = {
  hfUsername?: string;
};

const setupGatedAccessIntercepts = ({ hfUsername }: GatedAccessInterceptOptions = {}) => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelCatalog: false,
      disableModelRegistry: false,
      disableModelServing: false,
    }),
  );

  setupModelCatalogIntercepts();

  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.MODEL_REGISTRY]: {
          managementState: 'Managed',
        },
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/aihub',
    mockAIHubNamespaceResponse({ instancesNamespace: REGISTRIES_NAMESPACE }),
  );

  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/model_catalog/sources',
    { path: { apiVersion: API_VERSION } },
    {
      data: {
        items: [
          {
            id: SOURCE_ID,
            name: 'Hugging Face',
            enabled: true,
            labels: ['Community'],
            status: 'available',
            ...(hfUsername ? { hfUsername, hasApiKey: true, authenticated: true } : {}),
          },
        ],
        size: 1,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  );

  cy.intercept(
    'GET',
    `**/model-registry/api/${API_VERSION}/model_catalog/sources/${SOURCE_ID}/models/**`,
    { body: { data: gatedDeniedModel } },
  ).as('getGatedModel');

  cy.intercept(
    'GET',
    `**/model-registry/api/${API_VERSION}/model_catalog/sources/${SOURCE_ID}/artifacts/**`,
    {
      body: {
        data: {
          items: [],
          size: 0,
          pageSize: 10,
          nextPageToken: '',
        },
      },
    },
  );
};

const visitGatedModelDetails = () => {
  cy.visitWithLogin(`/ai-hub/models/catalog/${SOURCE_ID}/${ENCODED_MODEL_NAME}/overview`);
  cy.wait('@getGatedModel');
  modelDetailsPage.findPageTitle().should('exist');
};

describe('Model Catalog Details Page - Gated models', () => {
  it('non-admin sees standard details UI with Gated label (no access-required empty state)', () => {
    asProjectEditUser();
    setupGatedAccessIntercepts({ hfUsername: 'alice' });
    visitGatedModelDetails();

    modelDetailsPage.findGatedAccessRequiredState().should('not.exist');
    modelDetailsPage.findAccessLabelGated().should('be.visible').and('contain.text', 'Gated');
    modelDetailsPage.findOverviewTab().should('be.visible');
    modelDetailsPage.findLongDescription().should('contain.text', 'Gated model details');
  });

  it('admin sees the same standard details UI with Gated label', () => {
    asClusterAdminUser();
    setupGatedAccessIntercepts({ hfUsername: 'alice' });
    visitGatedModelDetails();

    modelDetailsPage.findGatedAccessRequiredState().should('not.exist');
    modelDetailsPage.findGatedAccessRequestLink().should('not.exist');
    modelDetailsPage.findAccessLabelGated().should('be.visible').and('contain.text', 'Gated');
    modelDetailsPage.findOverviewTab().should('be.visible');
    modelDetailsPage.findLongDescription().should('contain.text', 'Gated model details');
  });
});
