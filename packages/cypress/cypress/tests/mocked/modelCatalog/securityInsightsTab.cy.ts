/* eslint-disable camelcase */
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockDsciStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDsciStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { modelDetailsPage } from '../../../pages/modelCatalog/modelDetailsPage';
import {
  mockSecurityArtifacts,
  mockSecurityArtifactsResponse,
} from '../../../utils/securityInsightsUtils';

const API_VERSION = 'v1';
const SOURCE_ID = 'sample-source';
const MODEL_NAME = 'repo1/model1';
const ENCODED_MODEL_NAME = 'repo1%2Fmodel1';
const REGISTRIES_NAMESPACE = 'odh-model-registries';

const catalogModel = {
  source_id: SOURCE_ID,
  name: MODEL_NAME,
  description: 'Sample catalog model for security insights mock tests.',
  provider: 'provider1',
  license: 'apache-2.0',
  tasks: ['text-generation'],
  customProperties: {},
};

const setupCommonIntercepts = ({ disableLMEval = false }: { disableLMEval?: boolean } = {}) => {
  asProductAdminUser();

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelCatalog: false,
      disableModelRegistry: false,
      disableLMEval,
    }),
  );

  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.MODEL_REGISTRY]: {
          managementState: 'Managed',
          registriesNamespace: REGISTRIES_NAMESPACE,
        },
        [DataScienceStackComponent.TRUSTY_AI]: { managementState: 'Managed' },
      },
    }),
  );

  cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({}));

  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/user',
    { path: { apiVersion: API_VERSION } },
    { data: { userId: 'user@example.com', clusterAdmin: true } },
  );

  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/namespaces',
    { path: { apiVersion: API_VERSION } },
    { data: [{ metadata: { name: REGISTRIES_NAMESPACE } }] },
  );

  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/model_registry',
    { path: { apiVersion: API_VERSION } },
    { data: [] },
  );

  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/model_catalog/sources',
    { path: { apiVersion: API_VERSION } },
    {
      data: {
        items: [
          {
            id: SOURCE_ID,
            name: 'Sample source',
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
    { body: { data: catalogModel } },
  );

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

const interceptSecurityArtifacts = (items = mockSecurityArtifacts()) => {
  cy.intercept(
    'GET',
    `**/eval-hub/api/${API_VERSION}/catalog/sources/${SOURCE_ID}/security_artifacts/**`,
    { body: mockSecurityArtifactsResponse(items) },
  ).as('getSecurityArtifacts');
};

describe('Model Catalog Security Insights tab (eval-hub extension)', () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });

  it('should show the security insights tab when LM eval and model catalog are enabled', () => {
    interceptSecurityArtifacts([]);
    modelDetailsPage.visitSecurityInsights(SOURCE_ID, ENCODED_MODEL_NAME);

    modelDetailsPage.findSecurityInsightsTab().should('exist');
    modelDetailsPage.findSecurityInsightsEmptyState().should('exist');
    cy.wait('@getSecurityArtifacts');
  });

  it('should still show the security insights tab when LM eval is disabled', () => {
    setupCommonIntercepts({ disableLMEval: true });
    interceptSecurityArtifacts([]);

    cy.visitWithLogin(`/ai-hub/models/catalog/${SOURCE_ID}/${ENCODED_MODEL_NAME}/overview`);
    modelDetailsPage.findPageTitle().should('exist');
    modelDetailsPage.findSecurityInsightsTab().should('exist');
  });

  it('should render security insights table content from the eval-hub API', () => {
    interceptSecurityArtifacts();
    modelDetailsPage.visitSecurityInsights(SOURCE_ID, ENCODED_MODEL_NAME);

    modelDetailsPage.findSecurityInsightsTab().should('exist');
    modelDetailsPage.findSecurityInsightsTable().should('contain.text', 'Toxicity');
    modelDetailsPage.findSecurityInsightsTable().should('contain.text', 'PII Leakage');
    modelDetailsPage.findSecurityInsightsTable().should('contain.text', '92.0%');
    modelDetailsPage.findSecurityInsightsEmptyState().should('not.exist');
    cy.wait('@getSecurityArtifacts');
  });
});
