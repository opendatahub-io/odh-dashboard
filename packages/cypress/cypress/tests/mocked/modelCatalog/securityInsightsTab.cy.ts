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
import {
  mockQualityArtifacts,
  mockQualityArtifactsResponse,
} from '../../../utils/qualityInsightsUtils';

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

const interceptShouldShowSecurityArtifacts = (hasData = true) => {
  cy.intercept(
    {
      method: 'GET',
      url: new RegExp(`/eval-hub/api/${API_VERSION}/catalog/sources/.*/security_artifacts/.*`),
      query: { pageSize: '1' },
      times: 1,
    },
    {
      body: {
        data: {
          items: hasData ? [{ id: 'mock-artifact' }] : [],
          size: hasData ? 1 : 0,
          pageSize: 1,
          nextPageToken: '',
        },
      },
    },
  ).as('shouldShowSecurityArtifacts');
};

const interceptSecurityArtifacts = (items = mockSecurityArtifacts()) => {
  cy.intercept(
    'GET',
    `**/eval-hub/api/${API_VERSION}/catalog/sources/${SOURCE_ID}/security_artifacts/**`,
    { body: mockSecurityArtifactsResponse(items) },
  ).as('getSecurityArtifacts');
};

const interceptShouldShowQualityArtifacts = (hasData = true) => {
  cy.intercept(
    {
      method: 'GET',
      url: new RegExp(`/eval-hub/api/${API_VERSION}/catalog/sources/.*/quality_artifacts/.*`),
      query: { pageSize: '1' },
      times: 1,
    },
    {
      body: {
        data: {
          items: hasData ? [{ id: 'mock-quality-artifact' }] : [],
          size: hasData ? 1 : 0,
          pageSize: 1,
          nextPageToken: '',
        },
      },
    },
  ).as('shouldShowQualityArtifacts');
};

const interceptQualityArtifacts = (items = mockQualityArtifacts()) => {
  cy.intercept(
    'GET',
    `**/eval-hub/api/${API_VERSION}/catalog/sources/${SOURCE_ID}/quality_artifacts/**`,
    { body: mockQualityArtifactsResponse(items) },
  ).as('getQualityArtifacts');
};

describe('Model Catalog Security Insights tab (eval-hub extension)', () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });

  it('should show the security insights tab when LM eval and model catalog are enabled', () => {
    interceptSecurityArtifacts([]);
    interceptShouldShowSecurityArtifacts(true);
    modelDetailsPage.visitSecurityInsights(SOURCE_ID, ENCODED_MODEL_NAME);

    modelDetailsPage.findSecurityInsightsTab().should('exist');
    modelDetailsPage.findSecurityInsightsEmptyState().should('exist');
    cy.findByTestId('security-insights-empty-state-link').should('exist');
    cy.wait('@getSecurityArtifacts');
  });

  it('should hide the security insights tab when no security artifacts exist', () => {
    interceptShouldShowSecurityArtifacts(false);

    cy.visitWithLogin(`/ai-hub/models/catalog/${SOURCE_ID}/${ENCODED_MODEL_NAME}/overview`);
    modelDetailsPage.findPageTitle().should('exist');
    cy.wait('@shouldShowSecurityArtifacts');
    modelDetailsPage.findSecurityInsightsTab().should('not.exist');
  });

  it('should show the security insights tab when LM eval is disabled', () => {
    setupCommonIntercepts({ disableLMEval: true });
    interceptSecurityArtifacts([]);
    interceptShouldShowSecurityArtifacts(true);

    modelDetailsPage.visitSecurityInsights(SOURCE_ID, ENCODED_MODEL_NAME);
    cy.wait('@shouldShowSecurityArtifacts');
    modelDetailsPage.findSecurityInsightsTab().should('exist');
    modelDetailsPage.findSecurityInsightsEmptyState().should('exist');
    cy.findByTestId('security-insights-empty-state-link').should('not.exist');
    cy.wait('@getSecurityArtifacts');
  });

  it('should render security insights table content from the eval-hub API', () => {
    interceptSecurityArtifacts();
    interceptShouldShowSecurityArtifacts(true);
    modelDetailsPage.visitSecurityInsights(SOURCE_ID, ENCODED_MODEL_NAME);

    cy.wait('@shouldShowSecurityArtifacts');
    modelDetailsPage.findSecurityInsightsTab().should('exist');
    modelDetailsPage.findSecurityInsightsTable().should('contain.text', 'Toxicity');
    modelDetailsPage.findSecurityInsightsTable().should('contain.text', 'PII Leakage');
    modelDetailsPage.findSecurityInsightsTable().should('contain.text', '92.0%');
    modelDetailsPage.findSecurityInsightsTable().should('contain.text', '100.0%');
    modelDetailsPage.findSecurityInsightsEmptyState().should('not.exist');
    cy.wait('@getSecurityArtifacts');
  });

  it('should show quality insights when evaluation artifacts exist', () => {
    interceptQualityArtifacts();
    interceptShouldShowQualityArtifacts(true);
    modelDetailsPage.visitQualityInsights(SOURCE_ID, ENCODED_MODEL_NAME);

    modelDetailsPage.findQualityInsightsTab().should('exist');
    modelDetailsPage.findQualityInsightsTable().should('contain.text', 'HumanEval');
    modelDetailsPage.findQualityInsightsTable().should('contain.text', '62.8%');
    modelDetailsPage.findQualityInsightsTable().should('contain.text', 'BBH');
    cy.wait('@shouldShowQualityArtifacts');
    cy.wait('@getQualityArtifacts');
  });

  it('should hide quality insights when no evaluation artifacts exist', () => {
    interceptShouldShowQualityArtifacts(false);

    cy.visitWithLogin(`/ai-hub/models/catalog/${SOURCE_ID}/${ENCODED_MODEL_NAME}/overview`);
    modelDetailsPage.findPageTitle().should('exist');
    cy.wait('@shouldShowQualityArtifacts');
    modelDetailsPage.findQualityInsightsTab().should('not.exist');
  });

  it('should show quality insights when LM eval is disabled', () => {
    setupCommonIntercepts({ disableLMEval: true });
    interceptQualityArtifacts([]);
    interceptShouldShowQualityArtifacts(true);

    modelDetailsPage.visitQualityInsights(SOURCE_ID, ENCODED_MODEL_NAME);
    modelDetailsPage.findQualityInsightsTab().should('exist');
    modelDetailsPage.findQualityInsightsEmptyState().should('exist');
    cy.findByTestId('quality-insights-empty-state-link').should('not.exist');
    cy.wait('@shouldShowQualityArtifacts');
    cy.wait('@getQualityArtifacts');
  });

  it('should redirect a hidden quality deep link to the overview tab', () => {
    interceptShouldShowQualityArtifacts(false);

    cy.visitWithLogin(`/ai-hub/models/catalog/${SOURCE_ID}/${ENCODED_MODEL_NAME}/quality-insights`);
    modelDetailsPage.findPageTitle().should('exist');
    cy.wait('@shouldShowQualityArtifacts');
    modelDetailsPage.findOverviewTab().should('have.attr', 'aria-selected', 'true');
  });
});
