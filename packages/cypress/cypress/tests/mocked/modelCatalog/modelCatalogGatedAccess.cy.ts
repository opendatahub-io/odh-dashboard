/* eslint-disable camelcase */
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { ModelRegistryMetadataType } from '@odh-dashboard/model-registry/types/types';
import { asClusterAdminUser, asProjectEditUser } from '../../../utils/mockUsers';
import { modelDetailsPage } from '../../../pages/modelCatalog/modelDetailsPage';
import { API_VERSION, setupModelCatalogIntercepts } from '../catalogHelpers';

const SOURCE_ID = 'hugging_face_source';
const MODEL_NAME = 'meta-llama/Llama-3.1-8B-Instruct-INT8';
const ENCODED_MODEL_NAME = 'meta-llama%2FLlama-3.1-8B-Instruct-INT8';
const REGISTRIES_NAMESPACE = 'odh-model-registries';

const gatedDeniedModel = {
  source_id: SOURCE_ID,
  name: MODEL_NAME,
  description: '',
  readme: '',
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

const setupGatedAccessIntercepts = () => {
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
          registriesNamespace: REGISTRIES_NAMESPACE,
        },
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
      },
    }),
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

describe('Model Catalog Details Page - Gated access denied', () => {
  it('non-admin sees gated empty state with disabled deploy and register actions', () => {
    asProjectEditUser();
    setupGatedAccessIntercepts();
    visitGatedModelDetails();

    modelDetailsPage.findGatedAccessRequiredState().should('be.visible');
    modelDetailsPage
      .findGatedAccessRequiredState()
      .should('contain.text', 'To request access, contact your administrator.');
    modelDetailsPage.findWhosMyAdministratorLink().should('be.visible');
    modelDetailsPage.findGatedAccessRequestLink().should('not.exist');
    modelDetailsPage.findModelCardMarkdown().should('not.exist');
    modelDetailsPage.findAccessLabelGatedDenied().should('be.visible');
    modelDetailsPage.findDeployModelButton().should('have.attr', 'aria-disabled', 'true');
    modelDetailsPage.findRegisterModelButton().should('have.attr', 'aria-disabled', 'true');
  });

  it('admin sees Hugging Face request link with disabled deploy and register actions', () => {
    asClusterAdminUser();
    setupGatedAccessIntercepts();
    visitGatedModelDetails();

    modelDetailsPage.findGatedAccessRequiredState().should('be.visible');
    modelDetailsPage
      .findGatedAccessRequiredState()
      .should('contain.text', 'Go to Hugging Face to request permission for this model.');
    modelDetailsPage.findGatedAccessRequestLink().should('be.visible');
    modelDetailsPage.findWhosMyAdministratorLink().should('not.exist');
    modelDetailsPage.findDeployModelButton().should('have.attr', 'aria-disabled', 'true');
    modelDetailsPage.findRegisterModelButton().should('have.attr', 'aria-disabled', 'true');
  });
});
