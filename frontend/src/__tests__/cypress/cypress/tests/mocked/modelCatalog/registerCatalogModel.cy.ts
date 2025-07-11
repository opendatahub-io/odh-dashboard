/* eslint-disable camelcase */
import {
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockModelRegistryService,
  mockModelVersion,
  mockRegisteredModel,
} from '#~/__mocks__';
import {
  mockModelCatalogConfigMap,
  mockUnmanagedModelCatalogConfigMap,
} from '#~/__mocks__/mockModelCatalogConfigMap';
import { ConfigMapModel, ServiceModel } from '#~/__tests__/cypress/cypress/utils/models';
import type { ServiceKind } from '#~/k8sTypes';
import { mockModelArtifact } from '#~/__mocks__/mockModelArtifact';
import type { ModelArtifact, ModelVersion, RegisteredModel } from '#~/concepts/modelRegistry/types';
import {
  ModelArtifactState,
  ModelRegistryMetadataType,
  ModelState,
} from '#~/concepts/modelRegistry/types';
import { mockRegisteredModelList } from '#~/__mocks__/mockRegisteredModelsList';
import { registerCatalogModelPage } from '#~/__tests__/cypress/cypress/pages/modelCatalog/registerCatalogModel';
import {
  FormFieldSelector,
  registerModelPage,
} from '#~/__tests__/cypress/cypress/pages/modelRegistry/registerModelPage';

const existingModelName = 'model1';
const MODEL_REGISTRY_API_VERSION = 'v1alpha3';

type HandlersProps = {
  modelRegistries?: ServiceKind[];
};

const initIntercepts = ({
  modelRegistries = [
    mockModelRegistryService({ name: 'modelregistry-sample' }),
    mockModelRegistryService({
      name: 'modelregistry-sample-2',
      serverUrl: 'modelregistry-sample-2-rest.com:443',
      description: '',
    }),
  ],
}: HandlersProps) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        'model-registry-operator': true,
      },
    }),
  );

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelCatalog: false,
    }),
  );

  cy.interceptK8s(
    {
      model: ConfigMapModel,
      ns: 'opendatahub',
      name: 'model-catalog-sources',
    },
    mockModelCatalogConfigMap(),
  );

  cy.interceptK8s(
    {
      model: ConfigMapModel,
      ns: 'opendatahub',
      name: 'model-catalog-unmanaged-sources',
    },
    mockUnmanagedModelCatalogConfigMap([]),
  );

  cy.interceptK8sList(ServiceModel, mockK8sResourceList(modelRegistries));
  cy.interceptOdh(
    'POST /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models',
    {
      path: {
        serviceName: 'modelregistry-sample-2',
        apiVersion: MODEL_REGISTRY_API_VERSION,
      },
    },
    mockRegisteredModel({
      id: '1',
      name: 'granite-8b-code-instruct',
      customProperties: {
        'granite-3.1': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        language: {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
      },
    }),
  ).as('createRegisteredModel');

  cy.interceptOdh(
    'POST /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId/versions',
    {
      path: {
        serviceName: 'modelregistry-sample-2',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    mockModelVersion({
      id: '2',
      name: 'Version 1',
      customProperties: {
        License: {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: 'https://www.apache.org/licenses/LICENSE-2.0.txt',
        },
        Provider: {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: 'IBM',
        },
        'Register from': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: 'Model catalog',
        },
        'Source model': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: 'granite-8b-code-instruct',
        },
        'Source model version': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '1.3-1732870892',
        },
        'granite-3.1': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        language: {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
      },
    }),
  ).as('createModelVersion');

  cy.interceptOdh(
    'POST /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts',
    {
      path: {
        serviceName: 'modelregistry-sample-2',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 2,
      },
    },
    mockModelArtifact(),
  ).as('createModelArtifact');

  cy.interceptOdh(
    'PATCH /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId',
    {
      path: {
        serviceName: 'modelregistry-sample-2',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: '1',
      },
    },
    mockRegisteredModel({ id: '1', name: 'granite-8b-code-instruct' }),
  ).as('updateRegisteredModel');

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models`,
    {
      path: { serviceName: 'modelregistry-sample', apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    mockRegisteredModelList({
      items: [
        mockRegisteredModel({
          id: '1',
          name: existingModelName,
        }),
        mockRegisteredModel({
          id: '2',
          name: 'model2',
        }),
      ],
    }),
  ).as('getRegisteredModels');

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models`,
    {
      path: { serviceName: 'modelregistry-sample-2', apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    mockRegisteredModelList({
      items: [
        mockRegisteredModel({
          id: '1',
          name: existingModelName,
        }),
        mockRegisteredModel({
          id: '2',
          name: 'model2',
        }),
      ],
    }),
  );
};

describe('Register catalog model page', () => {
  it('Register catalog model page should pre-select the model registry when only one present', () => {
    initIntercepts({
      modelRegistries: [mockModelRegistryService({ name: 'modelregistry-sample' })],
    });
    registerCatalogModelPage.visit();
    registerCatalogModelPage.findModelRegistrySelector().should('be.disabled');
    registerModelPage.findSubmitButton().should('be.enabled');
  });

  it('Verify the app title and breadcrumb', () => {
    initIntercepts({
      modelRegistries: [mockModelRegistryService({ name: 'modelregistry-sample' })],
    });
    registerCatalogModelPage.visit('granite-3.1-8b-code-instruct-1.3.0');
    registerModelPage
      .findAppTitle()
      .should('have.text', 'Register granite-3.1-8b-code-instruct-1.3.0 model');
    registerModelPage
      .findBreadcrumbModelName()
      .should('have.text', 'granite-3.1-8b-code-instruct-1.3.0');
  });

  it('Register catalog model page ', () => {
    initIntercepts({});
    registerCatalogModelPage.visit();
    registerCatalogModelPage
      .findModelRegistrySelector()
      .findSelectOption('modelregistry-sample-2')
      .click();
    registerModelPage.findSubmitButton().should('be.enabled');
    registerModelPage
      .findFormField(FormFieldSelector.MODEL_NAME)
      .should('have.value', 'granite-8b-code-instruct-1.3.0');
    registerModelPage
      .findFormField(FormFieldSelector.MODEL_DESCRIPTION)
      .should(
        'have.value',
        'Granite-8B-Code-Instruct is a 8B parameter model fine tuned from Granite-8B-Code-Base on a combination of permissively licensed instruction data to enhance instruction following capabilities including logical reasoning and problem-solving skills.',
      );
    registerModelPage
      .findFormField(FormFieldSelector.VERSION_NAME)
      .should('have.value', 'Version 1');
    registerModelPage.findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT).type('caikit');
    registerModelPage.findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION).type('1');
    registerModelPage
      .findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE)
      .should('be.disabled');
    registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_URI).should('be.checked');

    registerModelPage.findSubmitButton().click();
    cy.wait('@createRegisteredModel').then((interception) => {
      expect(interception.request.body).to.containSubset({
        name: 'granite-8b-code-instruct-1.3.0',
        description:
          'Granite-8B-Code-Instruct is a 8B parameter model fine tuned from Granite-8B-Code-Base on a combination of permissively licensed instruction data to enhance instruction following capabilities including logical reasoning and problem-solving skills.',
        customProperties: {
          language: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
          'granite-3.1': { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
        },
        state: ModelState.LIVE,
      } satisfies Partial<RegisteredModel>);
    });

    cy.wait('@createModelVersion').then((interception) => {
      expect(interception.request.body).to.containSubset({
        name: 'Version 1',
        description: '',
        customProperties: {
          language: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
          'granite-3.1': { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
          License: {
            string_value: 'https://www.apache.org/licenses/LICENSE-2.0.txt',
            metadataType: ModelRegistryMetadataType.STRING,
          },
          Provider: { string_value: 'IBM', metadataType: ModelRegistryMetadataType.STRING },
          'Registered from': {
            string_value: 'Model catalog',
            metadataType: ModelRegistryMetadataType.STRING,
          },
          'Source model': {
            string_value: 'granite-8b-code-instruct',
            metadataType: ModelRegistryMetadataType.STRING,
          },
          'Source model version': {
            string_value: '1.3.0',
            metadataType: ModelRegistryMetadataType.STRING,
          },
        },
        state: ModelState.LIVE,
        author: 'test-user',
        registeredModelId: '1',
      } satisfies Partial<ModelVersion>);
    });

    cy.wait('@createModelArtifact').then((interception) => {
      expect(interception.request.body).to.containSubset({
        name: 'Version 1',
        description: '',
        customProperties: {},
        state: ModelArtifactState.LIVE,
        author: 'test-user',
        modelFormatName: 'caikit',
        modelFormatVersion: '1',
        uri: 'oci://registry.redhat.io/rhelai1/granite-8b-code-instruct:1.3-1732870892',
        artifactType: 'model-artifact',
      } satisfies Partial<ModelArtifact>);
    });

    cy.url().should('include', '/modelRegistry/modelregistry-sample-2/registeredModels/1');
  });

  it('Disables submit if model name is duplicated', () => {
    initIntercepts({});
    registerCatalogModelPage.visit();
    registerCatalogModelPage
      .findModelRegistrySelector()
      .findSelectOption('modelregistry-sample-2')
      .click();
    registerModelPage.findSubmitButton().should('be.enabled');
    registerModelPage
      .findFormField(FormFieldSelector.MODEL_NAME)
      .should('have.value', 'granite-8b-code-instruct-1.3.0');
    registerModelPage.findFormField(FormFieldSelector.MODEL_NAME).clear().type(existingModelName);
    registerModelPage.findSubmitButton().should('be.disabled');
    registerModelPage.findModelNameError().contains('Model name already exists');
  });

  it('should not reset user input to prefilled values after some time', () => {
    initIntercepts({});
    registerCatalogModelPage.visit();
    registerCatalogModelPage
      .findModelRegistrySelector()
      .findSelectOption('modelregistry-sample-2')
      .click();
    registerModelPage
      .findFormField(FormFieldSelector.MODEL_NAME)
      .should('have.value', 'granite-8b-code-instruct-1.3.0');
    registerModelPage
      .findFormField(FormFieldSelector.MODEL_DESCRIPTION)
      .should(
        'contain.value',
        'Granite-8B-Code-Instruct is a 8B parameter model fine tuned from Granite-8B-Code-Base on a combination of permissively licensed instruction data to enhance instruction following capabilities including logical reasoning and problem-solving skills.',
      );
    registerModelPage
      .findFormField(FormFieldSelector.VERSION_NAME)
      .should('have.value', 'Version 1');
    // User types new values and assert stability for 30s
    registerModelPage
      .findFormField(FormFieldSelector.MODEL_NAME)
      .clear()
      .type('user-typed-model')
      .should('have.value', 'user-typed-model', { timeout: 30000 });
    registerModelPage
      .findFormField(FormFieldSelector.MODEL_DESCRIPTION)
      .clear()
      .type('user-typed-description')
      .should('have.value', 'user-typed-description', { timeout: 30000 });
    registerModelPage
      .findFormField(FormFieldSelector.VERSION_NAME)
      .clear()
      .type('user-typed-version')
      .should('have.value', 'user-typed-version', { timeout: 30000 });
  });
});
