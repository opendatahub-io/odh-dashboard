import { mockDashboardConfig, mockDscStatus, mockK8sResourceList } from '~/__mocks__';
import { mockDsciStatus } from '~/__mocks__/mockDsciStatus';
import { StackCapability, StackComponent } from '~/concepts/areas/types';
import { ModelRegistryModel } from '~/__tests__/cypress/cypress/utils/models';
import {
  FormFieldSelector,
  registerModelPage,
} from '~/__tests__/cypress/cypress/pages/modelRegistry/registerModelPage';
import { mockModelRegistry } from '~/__mocks__/mockModelRegistry';
import { mockRegisteredModel } from '~/__mocks__/mockRegisteredModel';
import { mockModelVersion } from '~/__mocks__/mockModelVersion';
import { mockModelArtifact } from '~/__mocks__/mockModelArtifact';
import {
  ModelArtifactState,
  ModelState,
  type RegisteredModel,
  type ModelVersion,
  type ModelArtifact,
} from '~/concepts/modelRegistry/types';

const MODEL_REGISTRY_API_VERSION = 'v1alpha3';

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
      installedComponents: {
        [StackComponent.MODEL_REGISTRY]: true,
        [StackComponent.MODEL_MESH]: true,
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/dsci/status',
    mockDsciStatus({
      requiredCapabilities: [StackCapability.SERVICE_MESH, StackCapability.SERVICE_MESH_AUTHZ],
    }),
  );

  // TODO replace these with a mock list of services when https://github.com/opendatahub-io/odh-dashboard/pull/3034 is merged
  cy.interceptK8sList(
    ModelRegistryModel,
    mockK8sResourceList([mockModelRegistry({ name: 'modelregistry-sample' })]),
  );
  cy.interceptK8s(ModelRegistryModel, mockModelRegistry({ name: 'modelregistry-sample' }));

  cy.interceptOdh(
    'POST /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
      },
    },
    mockRegisteredModel({ id: '1', name: 'Test model name' }),
  ).as('createRegisteredModel');

  cy.interceptOdh(
    'POST /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId/versions',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    mockModelVersion({ id: '2', name: 'Test version name' }),
  ).as('createModelVersion');

  cy.interceptOdh(
    'POST /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 2,
      },
    },
    mockModelArtifact(),
  ).as('createModelArtifact');
};

describe('Register model page', () => {
  beforeEach(() => {
    initIntercepts();
    registerModelPage.visit();
  });

  it('Disables submit until required fields are filled in object storage mode', () => {
    registerModelPage.findSubmitButton().should('be.disabled');
    registerModelPage.findFormField(FormFieldSelector.MODEL_NAME).type('Test model name');
    registerModelPage.findFormField(FormFieldSelector.VERSION_NAME).type('Test version name');
    registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE).click();
    registerModelPage
      .findFormField(FormFieldSelector.LOCATION_ENDPOINT)
      .type('http://s3.amazonaws.com/');
    registerModelPage.findFormField(FormFieldSelector.LOCATION_BUCKET).type('test-bucket');
    registerModelPage
      .findFormField(FormFieldSelector.LOCATION_PATH)
      .type('demo-models/flan-t5-small-caikit');
    registerModelPage.findSubmitButton().should('be.enabled');
  });

  it('Creates expected resources on submit in object storage mode', () => {
    registerModelPage.findFormField(FormFieldSelector.MODEL_NAME).type('Test model name');
    registerModelPage
      .findFormField(FormFieldSelector.MODEL_DESCRIPTION)
      .type('Test model description');
    registerModelPage.findFormField(FormFieldSelector.VERSION_NAME).type('Test version name');
    registerModelPage
      .findFormField(FormFieldSelector.VERSION_DESCRIPTION)
      .type('Test version description');
    registerModelPage.findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT).type('caikit');
    registerModelPage.findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION).type('1');
    registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE).click();
    registerModelPage
      .findFormField(FormFieldSelector.LOCATION_ENDPOINT)
      .type('http://s3.amazonaws.com/');
    registerModelPage.findFormField(FormFieldSelector.LOCATION_BUCKET).type('test-bucket');
    registerModelPage.findFormField(FormFieldSelector.LOCATION_REGION).type('us-east-1');
    registerModelPage
      .findFormField(FormFieldSelector.LOCATION_PATH)
      .type('demo-models/flan-t5-small-caikit');

    registerModelPage.findSubmitButton().click();

    cy.wait('@createRegisteredModel').then((interception) => {
      expect(interception.request.body).to.containSubset({
        name: 'Test model name',
        description: 'Test model description',
        customProperties: {},
        state: ModelState.LIVE,
      } satisfies Partial<RegisteredModel>);
    });
    cy.wait('@createModelVersion').then((interception) => {
      expect(interception.request.body).to.containSubset({
        name: 'Test version name',
        description: 'Test version description',
        customProperties: {},
        state: ModelState.LIVE,
        author: 'test-user',
        registeredModelId: '1',
      } satisfies Partial<ModelVersion>);
    });
    cy.wait('@createModelArtifact').then((interception) => {
      expect(interception.request.body).to.containSubset({
        name: 'Test model name-Test version name-artifact',
        description: 'Test version description',
        customProperties: {},
        state: ModelArtifactState.LIVE,
        author: 'test-user',
        modelFormatName: 'caikit',
        modelFormatVersion: '1',
        uri: 's3://test-bucket/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1',
        artifactType: 'model-artifact',
      } satisfies Partial<ModelArtifact>);
    });

    cy.url().should('include', '/modelRegistry/modelregistry-sample/registeredModels/1');
  });

  it('Disables submit until required fields are filled in URI mode', () => {
    registerModelPage.findSubmitButton().should('be.disabled');
    registerModelPage.findFormField(FormFieldSelector.MODEL_NAME).type('Test model name');
    registerModelPage.findFormField(FormFieldSelector.VERSION_NAME).type('Test version name');
    registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_URI).click();
    registerModelPage
      .findFormField(FormFieldSelector.LOCATION_URI)
      .type(
        's3://test-bucket/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1',
      );
    registerModelPage.findSubmitButton().should('be.enabled');
  });

  it('Creates expected resources on submit in URI mode', () => {
    registerModelPage.findFormField(FormFieldSelector.MODEL_NAME).type('Test model name');
    registerModelPage
      .findFormField(FormFieldSelector.MODEL_DESCRIPTION)
      .type('Test model description');
    registerModelPage.findFormField(FormFieldSelector.VERSION_NAME).type('Test version name');
    registerModelPage
      .findFormField(FormFieldSelector.VERSION_DESCRIPTION)
      .type('Test version description');
    registerModelPage.findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT).type('caikit');
    registerModelPage.findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION).type('1');
    registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_URI).click();
    registerModelPage
      .findFormField(FormFieldSelector.LOCATION_URI)
      .type(
        's3://test-bucket/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1',
      );

    registerModelPage.findSubmitButton().click();

    cy.wait('@createRegisteredModel').then((interception) => {
      expect(interception.request.body).to.containSubset({
        name: 'Test model name',
        description: 'Test model description',
        customProperties: {},
        state: ModelState.LIVE,
      } satisfies Partial<RegisteredModel>);
    });
    cy.wait('@createModelVersion').then((interception) => {
      expect(interception.request.body).to.containSubset({
        name: 'Test version name',
        description: 'Test version description',
        customProperties: {},
        state: ModelState.LIVE,
        author: 'test-user',
        registeredModelId: '1',
      } satisfies Partial<ModelVersion>);
    });
    cy.wait('@createModelArtifact').then((interception) => {
      expect(interception.request.body).to.containSubset({
        name: 'Test model name-Test version name-artifact',
        description: 'Test version description',
        customProperties: {},
        state: ModelArtifactState.LIVE,
        author: 'test-user',
        modelFormatName: 'caikit',
        modelFormatVersion: '1',
        uri: 's3://test-bucket/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1',
        artifactType: 'model-artifact',
      } satisfies Partial<ModelArtifact>);
    });

    cy.url().should('include', '/modelRegistry/modelregistry-sample/registeredModels/1');
  });
});
