import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockDsciStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDsciStatus';
import {
  mockConnectionTypeConfigMap,
  mockOciConnectionTypeConfigMap,
} from '@odh-dashboard/k8s-core/__mocks__/mockConnectionType';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { IdentifierResourceType } from '@odh-dashboard/k8s-core';
import {
  mockGlobalScopedHardwareProfiles,
  mockHardwareProfile,
} from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { mockStandardModelServingTemplateK8sResources } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { asProductAdminUser } from '@odh-dashboard/cypress/cypress/utils/mockUsers';
import {
  HardwareProfileModel,
  ProjectModel,
  TemplateModel,
} from '@odh-dashboard/cypress/cypress/utils/models';
import { modelDetailsPage } from '@odh-dashboard/cypress/cypress/pages/modelCatalog/modelDetailsPage';
import { modelCatalog } from '@odh-dashboard/cypress/cypress/pages/modelCatalog/modelCatalog';
import { modelServingWizard } from '@odh-dashboard/cypress/cypress/pages/modelServing';

const API_VERSION = 'v1';
const SOURCE_ID = 'sample-source';
const MODEL_NAME = 'validated-model';
const REGISTRIES_NAMESPACE = 'odh-model-registries';
const MODEL_URI = 'oci://quay.io/test-org/validated-model:latest';

const EXPECTED_RUNTIME_ARGS = [
  '# Validated arguments for Tool calling',
  '--enable-auto-tool-choice',
  '--tool-call-parser granite',
  '--chat-template opt/app-root/template/tool_chat_template_granite.jinja',
].join('\n');

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

const initIntercepts = ({ toolCalling = true }: { toolCalling?: boolean } = {}) => {
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
      toolCalling,
      vLLMDeploymentOnMaaS: true,
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
    mockOciConnectionTypeConfigMap(),
  ]);
  cy.interceptOdh(
    'GET /api/namespaces/:namespace/:context',
    { path: { namespace: 'test-project', context: '*' } },
    { applied: true },
  );

  cy.interceptK8sList(
    { model: HardwareProfileModel, ns: 'opendatahub' },
    mockK8sResourceList([
      mockGlobalScopedHardwareProfiles[0],
      mockGlobalScopedHardwareProfiles[1],
      mockHardwareProfile({
        name: 'nvidia-profile',
        displayName: 'NVIDIA GPU Profile',
        identifiers: [
          {
            displayName: 'CPU',
            identifier: 'cpu',
            minCount: '4',
            maxCount: '8',
            defaultCount: '4',
            resourceType: IdentifierResourceType.CPU,
          },
          {
            displayName: 'Memory',
            identifier: 'memory',
            minCount: '8Gi',
            maxCount: '16Gi',
            defaultCount: '8Gi',
            resourceType: IdentifierResourceType.MEMORY,
          },
          {
            displayName: 'GPU',
            identifier: 'nvidia.com/gpu',
            minCount: 1,
            maxCount: 4,
            defaultCount: 1,
            resourceType: IdentifierResourceType.ACCELERATOR,
          },
        ],
      }),
    ]),
  );
  cy.interceptK8sList(
    TemplateModel,
    mockK8sResourceList(mockStandardModelServingTemplateK8sResources(), {
      namespace: 'opendatahub',
    }),
  );
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

const openWizardFromCatalog = () => {
  initIntercepts();
  modelDetailsPage.visit(SOURCE_ID, MODEL_NAME);
  modelCatalog.clickDeployModelButtonWithRetry();
  modelServingWizard.findPreconfigureStep().should('be.enabled');
};

const navigateToAdvancedOptions = () => {
  modelServingWizard.findPreconfigureProjectSelector().click();
  modelServingWizard.findPreconfigureProjectSelectorOption('Test Project').click();
  modelServingWizard.findNextButton().should('be.enabled').click();

  modelServingWizard.findModelSourceStep().should('be.enabled');
  modelServingWizard.findNextButton().should('be.enabled').click();

  modelServingWizard.findModelDeploymentStep().should('be.enabled');
  modelServingWizard.selectDeploymentMethodByKey('legacy');
  modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
  modelServingWizard.selectGlobalScopedTemplateOption('vLLM NVIDIA');
  modelServingWizard.findNextButton().should('be.enabled').click();

  modelServingWizard.findAdvancedOptionsStep().should('be.enabled');
};

describe('Preconfigure deployment validated arguments', () => {
  it('should carry validated arguments from catalog deploy through advanced and review', () => {
    openWizardFromCatalog();

    modelServingWizard.findValidatedConfigurationSection('args').should('be.visible');
    modelServingWizard.findValidatedConfigurationOption('tool-calling').should('be.visible');
    modelServingWizard
      .findValidatedConfigurationOptionCheckbox('tool-calling')
      .should('be.checked');

    navigateToAdvancedOptions();

    modelServingWizard.findRuntimeArgsCheckbox().should('be.checked');
    modelServingWizard.findRuntimeArgsTextBox().should('have.value', EXPECTED_RUNTIME_ARGS);

    modelServingWizard.findNextButton().should('be.enabled').click();

    modelServingWizard.findReviewStepModelDetailsSection().should('exist');
    cy.contains('Additional runtime arguments').should('exist');
    cy.contains('--enable-auto-tool-choice').should('exist');
    cy.contains('--tool-call-parser').should('exist');
    cy.contains('# Validated arguments').should('not.exist');
  });

  it('should remove validated args on uncheck and preserve user edits', () => {
    openWizardFromCatalog();

    modelServingWizard
      .findValidatedConfigurationOptionCheckbox('tool-calling')
      .should('be.checked')
      .click()
      .should('not.be.checked');
    modelServingWizard
      .findValidatedConfigurationOptionCheckbox('tool-calling')
      .click()
      .should('be.checked');

    navigateToAdvancedOptions();

    modelServingWizard.findRuntimeArgsTextBox().should('have.value', EXPECTED_RUNTIME_ARGS);
    modelServingWizard.findRuntimeArgsTextBox().type('{moveToEnd}\n--user-custom-arg');

    modelServingWizard.findPreconfigureStep().click();
    modelServingWizard
      .findValidatedConfigurationOptionCheckbox('tool-calling')
      .click()
      .should('not.be.checked');

    modelServingWizard.findAdvancedOptionsStep().click();
    modelServingWizard.findRuntimeArgsTextBox().should('have.value', '--user-custom-arg');
  });

  it('should not show the tool calling checkbox when the toolCalling flag is off', () => {
    initIntercepts({ toolCalling: false });
    modelDetailsPage.visit(SOURCE_ID, MODEL_NAME);
    modelCatalog.clickDeployModelButtonWithRetry();
    modelServingWizard.findPreconfigureStep().should('be.enabled');
    modelServingWizard.findValidatedConfigurationSection('args').should('not.exist');
    modelServingWizard.findValidatedConfigurationOption('tool-calling').should('not.exist');
  });
});
