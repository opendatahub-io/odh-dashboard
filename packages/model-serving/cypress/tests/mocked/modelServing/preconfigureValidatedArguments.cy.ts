import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockDsciStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDsciStatus';
import { mockConnectionTypeConfigMap } from '@odh-dashboard/k8s-core/__mocks__/mockConnectionType';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { asProductAdminUser } from '@odh-dashboard/cypress/cypress/utils/mockUsers';
import { ProjectModel } from '@odh-dashboard/cypress/cypress/utils/models';
import { modelDetailsPage } from '@odh-dashboard/cypress/cypress/pages/modelCatalog/modelDetailsPage';
import { modelCatalog } from '@odh-dashboard/cypress/cypress/pages/modelCatalog/modelCatalog';
import { modelServingWizard } from '@odh-dashboard/cypress/cypress/pages/modelServing';

const API_VERSION = 'v1';
const SOURCE_ID = 'sample-source';
const MODEL_NAME = 'validated-model';
const REGISTRIES_NAMESPACE = 'odh-model-registries';
const MODEL_URI = 'oci://quay.io/test-org/validated-model:latest';

/* eslint-disable camelcase -- catalog API payloads use snake_case field names */
const catalogModel = {
  source_id: SOURCE_ID,
  name: MODEL_NAME,
  description: 'Validated catalog model with tool calling for deploy handoff tests.',
  provider: 'provider1',
  license: 'apache-2.0',
  tasks: ['text-generation', 'tool-calling'],
  validatedTasks: ['tool-calling'],
  customProperties: {
    validated: {
      metadataType: 'MetadataStringValue',
      string_value: '',
    },
    validated_on: {
      metadataType: 'MetadataStringValue',
      string_value: '["RHOAI 2.20","RHAIIS 3.0","vLLM v0.8.5 - CUDA"]',
    },
  },
  servingConfig: {
    toolCalling: {
      toolCallParser: 'granite',
      chatTemplate: 'opt/app-root/template/tool_chat_template_granite.jinja',
      enableAutoToolChoice: true,
    },
  },
};
/* eslint-enable camelcase */

const initIntercepts = () => {
  asProductAdminUser();

  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
        [DataScienceStackComponent.MODEL_REGISTRY]: {
          managementState: 'Managed',
          registriesNamespace: REGISTRIES_NAMESPACE,
        },
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableNIMModelServing: true,
      disableKServe: false,
      disableModelCatalog: false,
      disableModelRegistry: false,
      toolCalling: true,
    }),
  );
  cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({}));
  cy.interceptOdh('GET /api/components', null, []);
  cy.interceptOdh('GET /api/connection-types', [
    mockConnectionTypeConfigMap({
      displayName: 'URI - v1',
      name: 'uri-v1',
      category: ['existing-category'],
      fields: [
        {
          type: 'uri',
          name: 'URI',
          envVar: 'URI',
          required: true,
          properties: {},
        },
      ],
    }),
  ]);
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));

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
          items: [
            {
              artifactType: 'model-artifact',
              createTimeSinceEpoch: '1739210683000',
              lastUpdateTimeSinceEpoch: '1739210683000',
              uri: MODEL_URI,
              customProperties: {},
            },
          ],
          size: 1,
          pageSize: 10,
          nextPageToken: '',
        },
      },
    },
  );
};

describe('Preconfigure deployment validated arguments', () => {
  it('should carry validated arguments from catalog deploy into the wizard', () => {
    initIntercepts();
    modelDetailsPage.visit(SOURCE_ID, MODEL_NAME);

    modelDetailsPage.findValidatedConfigurationsCard().should('be.visible');
    modelDetailsPage.findToolCallingCard().should('contain.text', 'Tool calling');

    modelCatalog.clickDeployModelButtonWithRetry();

    modelServingWizard.findPreconfigureStep().should('be.enabled');
    modelServingWizard.findValidatedConfigurationSection('args').should('be.visible');
    modelServingWizard.findValidatedConfigurationOption('tool-calling').should('be.visible');
    modelServingWizard
      .findValidatedConfigurationOptionCheckbox('tool-calling')
      .should('be.checked');
  });
});
