import {
  mockCustomSecretK8sResource,
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockSecretK8sResource,
} from '~/__mocks__';
import { mockDsciStatus } from '~/__mocks__/mockDsciStatus';
import { StackComponent } from '~/concepts/areas/types';
import { ProjectModel, SecretModel, ServiceModel } from '~/__tests__/cypress/cypress/utils/models';
import {
  FormFieldSelector,
  registerModelPage,
} from '~/__tests__/cypress/cypress/pages/modelRegistry/registerModelPage';
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
import { mockModelRegistryService } from '~/__mocks__/mockModelRegistryService';
import { mockRegisteredModelList } from '~/__mocks__/mockRegisteredModelsList';
import { KnownLabels } from '~/k8sTypes';

const MODEL_REGISTRY_API_VERSION = 'v1alpha3';
const existingModelName = 'model1';

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
  cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({}));
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({ k8sName: 'test-project', displayName: 'Test Project' }),
      mockProjectK8sResource({ k8sName: 'test-project-2', displayName: 'Test Project 2' }),
    ]),
  );
  cy.interceptK8sList(
    ServiceModel,
    mockK8sResourceList([
      mockModelRegistryService({ name: 'modelregistry-sample' }),
      mockModelRegistryService({ name: 'modelregistry-sample-2' }),
    ]),
  );

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
      ],
    }),
  ).as('getRegisteredModels');

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

  cy.interceptOdh(
    'PATCH /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: '1',
      },
    },
    mockRegisteredModel({ id: '1', name: 'Test model name' }),
  ).as('updateRegisteredModel');

  cy.interceptOdh(
    'PATCH /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: '2',
      },
    },
    mockModelVersion({ id: '2', name: 'Test version name' }),
  ).as('updateModelVersion');
};

describe('Register model page', () => {
  beforeEach(() => {
    initIntercepts();
    registerModelPage.visit();
  });

  it('Has Object storage autofill button if Object storage is selected', () => {
    registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE).click();
    registerModelPage
      .findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE)
      .should('be.checked');
    registerModelPage.findObjectStorageAutofillButton().should('be.visible');
  });

  it('Does not have Object storage autofill button if Object storage is not selected', () => {
    registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_URI).click();
    registerModelPage
      .findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE)
      .should('not.be.checked');
    registerModelPage.findObjectStorageAutofillButton().should('not.exist');
  });

  it('Has URI autofill button if URI is selected', () => {
    registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_URI).click();
    registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_URI).should('be.checked');
    registerModelPage.findURIAutofillButton().should('be.visible');
  });

  it('Does not have URI autofill button if URI is not selected', () => {
    registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE).click();
    registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_URI).should('not.be.checked');
    registerModelPage.findURIAutofillButton().should('not.exist');
  });

  it('Can open Object storage autofill modal', () => {
    registerModelPage.findConnectionAutofillModal().should('not.exist');
    registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE).click();
    registerModelPage.findObjectStorageAutofillButton().click();
    registerModelPage.findConnectionAutofillModal().should('exist');
  });

  it('Can open URI autofill modal', () => {
    registerModelPage.findConnectionAutofillModal().should('not.exist');
    registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_URI).click();
    registerModelPage.findURIAutofillButton().click();
    registerModelPage.findConnectionAutofillModal().should('exist');
  });

  it('Project selection with no connections displays message stating no object storage connections available', () => {
    registerModelPage.findConnectionAutofillModal().should('not.exist');
    registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE).click();
    registerModelPage.findObjectStorageAutofillButton().click();
    registerModelPage
      .findConnectionSelector()
      .contains('Select a project to view its available connections');
    registerModelPage.projectDropdown.openAndSelectItem('Test Project', true);
    registerModelPage.findConnectionSelector().contains('No available connections');
  });

  it('Project selection with no connections displays message stating no URI connections available', () => {
    registerModelPage.findConnectionAutofillModal().should('not.exist');
    registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_URI).click();
    registerModelPage.findURIAutofillButton().click();
    registerModelPage
      .findConnectionSelector()
      .contains('Select a project to view its available connections');
    registerModelPage.projectDropdown.openAndSelectItem('Test Project', true);
    registerModelPage.findConnectionSelector().contains('No available connections');
  });

  it('Project selection with connections displays connections and fills form', () => {
    cy.interceptK8sList(
      SecretModel,
      mockK8sResourceList([mockSecretK8sResource({ s3Bucket: 'cmhvZHMtcHVibGlj' })]),
    );
    registerModelPage.findConnectionAutofillModal().should('not.exist');
    registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE).click();
    registerModelPage.findObjectStorageAutofillButton().click();
    registerModelPage
      .findConnectionSelector()
      .contains('Select a project to view its available connections');
    registerModelPage.projectDropdown.openAndSelectItem('Test Project', true);
    registerModelPage.findConnectionSelector().contains('Select connection');
    registerModelPage.findConnectionSelector().findDropdownItem('Test Secret').click();
    registerModelPage.findAutofillButton().click();
    registerModelPage.findConnectionAutofillModal().should('not.exist');
    registerModelPage
      .findFormField(FormFieldSelector.LOCATION_ENDPOINT)
      .should('have.value', 'https://s3.amazonaws.com/');
    registerModelPage
      .findFormField(FormFieldSelector.LOCATION_BUCKET)
      .should('have.value', 'rhods-public');
    registerModelPage
      .findFormField(FormFieldSelector.LOCATION_REGION)
      .should('have.value', 'us-east-1');
  });

  it('Project selection with connections displays connections and fills form', () => {
    cy.interceptK8sList(
      SecretModel,
      mockK8sResourceList([
        mockCustomSecretK8sResource({
          namespace: 'test-project',
          name: 'test-secret',
          labels: {
            [KnownLabels.DATA_CONNECTION_AWS]: 'false',
          },
          annotations: {
            'opendatahub.io/connection-type': 'uri-v1',
            'openshift.io/display-name': 'Test Secret',
          },
          data: { URI: 'aHR0cHM6Ly9kZW1vLW1vZGVscy9zb21lLXBhdGguemlw' },
        }),
      ]),
    );
    registerModelPage.findConnectionAutofillModal().should('not.exist');
    registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_URI).click();
    registerModelPage.findURIAutofillButton().click();
    registerModelPage
      .findConnectionSelector()
      .contains('Select a project to view its available connections');
    registerModelPage.projectDropdown.openAndSelectItem('Test Project', true);
    registerModelPage.findConnectionSelector().contains('Select connection');
    registerModelPage.findConnectionSelector().findDropdownItem('Test Secret').click();
    registerModelPage.findAutofillButton().click();
    registerModelPage.findConnectionAutofillModal().should('not.exist');
    registerModelPage
      .findFormField(FormFieldSelector.LOCATION_URI)
      .should('have.value', 'https://demo-models/some-path.zip');
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

  it('Disables submit if model name is duplicated', () => {
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
    registerModelPage.findFormField(FormFieldSelector.MODEL_NAME).clear().type(existingModelName);
    registerModelPage.findSubmitButton().should('be.disabled');
    registerModelPage.findModelNameError().contains('Model name already exists');
  });

  it('Creates expected resources on submit in object storage mode', () => {
    const veryLongName = 'Test name'.repeat(15); // A string over 128 characters
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
    registerModelPage.findSubmitButton().should('be.enabled');

    registerModelPage.findFormField(FormFieldSelector.MODEL_NAME).clear().type(veryLongName);
    registerModelPage.findSubmitButton().should('be.disabled');
    registerModelPage.findFormField(FormFieldSelector.VERSION_NAME).clear().type(veryLongName);
    registerModelPage.findFormField(FormFieldSelector.MODEL_NAME).clear().type('Test model name');
    registerModelPage.findSubmitButton().should('be.disabled');
    registerModelPage
      .findFormField(FormFieldSelector.VERSION_NAME)
      .clear()
      .type('Test version name');
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
        name: 'Test version name',
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
        name: 'Test version name',
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
