import {
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
} from '@odh-dashboard/internal/__mocks__';
import { mockDsciStatus } from '@odh-dashboard/internal/__mocks__/mockDsciStatus';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { mockRegisteredModel } from '@odh-dashboard/internal/__mocks__/mockRegisteredModel';
import { mockModelVersion } from '@odh-dashboard/internal/__mocks__/mockModelVersion';
import {
  mockModelRegistry,
  mockModelRegistryService,
} from '@odh-dashboard/internal/__mocks__/mockModelRegistryService';
import { mockRegisteredModelList } from '@odh-dashboard/internal/__mocks__/mockRegisteredModelsList';
import { mockModelVersionList } from '@odh-dashboard/internal/__mocks__/mockModelVersionList';
import { mockModelArtifactList } from '@odh-dashboard/internal/__mocks__/mockModelArtifactList';
import { mockModelArtifact } from '@odh-dashboard/internal/__mocks__/mockModelArtifact';
import {
  ModelArtifactState,
  ModelState,
} from '@odh-dashboard/internal/concepts/modelRegistry/types';
import {
  FormFieldSelector,
  registerVersionPage,
} from '../../../pages/modelRegistry/registerVersionPage';
import { ServiceModel } from '../../../utils/models';

const MODEL_REGISTRY_API_VERSION = 'v1';

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
      components: {
        [DataScienceStackComponent.MODEL_REGISTRY]: { managementState: 'Managed' },
      },
    }),
  );
  cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({}));

  cy.interceptK8sList(
    ServiceModel,
    mockK8sResourceList([
      mockModelRegistryService({ name: 'modelregistry-sample' }),
      mockModelRegistryService({ name: 'modelregistry-sample-2' }),
    ]),
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/namespaces`,
    {
      path: { apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: [{ metadata: { name: 'odh-model-registries' } }] },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/user`,
    {
      path: { apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: { userId: 'user@example.com', clusterAdmin: true } },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models/:registeredModelId/versions`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    {
      data: mockModelVersionList({
        items: [mockModelVersion({ id: '1', name: 'Version 1' })],
      }),
    },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models/:registeredModelId/versions`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 2,
      },
    },
    {
      data: mockModelVersionList({
        items: [mockModelVersion({ id: '2', name: 'Version 2', registeredModelId: '2' })],
      }),
    },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models/:registeredModelId/versions`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 3,
      },
    },
    {
      data: mockModelVersionList({
        items: [
          mockModelVersion({
            id: '5',
            registeredModelId: '3',
            name: 'Test version for model 3',
          }),
        ],
      }),
    },
  );

  cy.interceptOdh(
    `POST /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models/:registeredModelId/versions`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    {
      data: mockModelVersion({ id: '6', name: 'Test version name' }),
    },
  ).as('createModelVersion');

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models/:registeredModelId/versions`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 4,
      },
    },
    {
      data: mockModelVersionList({
        items: [],
      }),
    },
  );

  cy.interceptOdh(
    `PATCH /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 1,
      },
    },
    { data: mockModelVersion({ id: '6', name: 'Test version name' }) },
  ).as('UpdatePropertyRow');

  cy.interceptOdh(
    `PATCH /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models/:registeredModelId`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    { data: mockRegisteredModel({ id: '1', name: 'Test model name' }) },
  ).as('patchRegisteredModel');

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 1,
      },
    },
    {
      data: mockModelArtifactList({
        items: [
          mockModelArtifact({
            uri: 's3://test-bucket-version-id-2/demo-models/test-path?endpoint=test-endpoint-version-id-2&defaultRegion=test-region-version-id-2',
          }),
        ],
      }),
    },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 5,
      },
    },
    {
      data: mockModelArtifactList({
        items: [],
      }),
    },
  );

  cy.interceptOdh(
    'POST /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId/artifacts',
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 6,
      },
    },
    {
      data: mockModelArtifact({
        uri: 's3://test-bucket-version-id-2/demo-models/flan-t5-small-caikit?endpoint=test-endpoint-version-id-2&defaultRegion=test-region-version-id-2',
      }),
    },
  ).as('createModelArtifact');

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 2,
      },
    },
    {
      data: mockModelArtifactList({
        items: [
          mockModelArtifact({
            modelFormatName: 'test-version-id-2-format-name',
            modelFormatVersion: 'test-version-id-2-format-version',
            uri: 's3://test',
          }),
        ],
      }),
    },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models/:registeredModelId`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    { data: mockRegisteredModel({ id: '1', name: 'Test model name' }) },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry`,
    {
      path: { apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: [mockModelRegistry({ name: 'modelregistry-sample' })] },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models`,
    {
      path: { modelRegistryName: 'modelregistry-sample', apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    {
      data: mockRegisteredModelList({
        items: [
          mockRegisteredModel({ id: '1', name: 'Test model 1' }),
          mockRegisteredModel({ id: '2', name: 'Test model 2' }),
          mockRegisteredModel({
            id: '3',
            name: 'Test model 3 has version but is missing artifact',
          }),
          mockRegisteredModel({ id: '4', name: 'Test model 4 is missing version and artifact' }),
        ],
      }),
    },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/namespaces`,
    {
      path: { apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: [{ metadata: { name: 'odh-model-registries' } }] },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/user`,
    {
      path: { apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    { data: { userId: 'user@example.com', clusterAdmin: true } },
  );
};

describe('Register model page with no preselected model', () => {
  beforeEach(() => {
    initIntercepts();
    registerVersionPage.visit();
  });

  it('Prefills version/artifact details when a model is selected', () => {
    registerVersionPage.selectRegisteredModel('Test model 1');
    cy.findByText('Current version is Version 1').should('exist');
    registerVersionPage
      .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT)
      .should('have.value', 'test model format');
    registerVersionPage
      .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
      .should('have.value', 'test version 1');
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE)
      .should('be.checked');
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_ENDPOINT)
      .should('have.value', 'test-endpoint-version-id-2');
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_BUCKET)
      .should('have.value', 'test-bucket-version-id-2');
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_REGION)
      .should('have.value', 'test-region-version-id-2');

    // Test model 2 has an invalid artifact URI so its object fields are reset
    registerVersionPage.selectRegisteredModel('Test model 2');
    cy.findByText('Current version is Version 2').should('exist');
    registerVersionPage
      .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT)
      .should('have.value', 'test-version-id-2-format-name');
    registerVersionPage
      .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
      .should('have.value', 'test-version-id-2-format-version');
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE)
      .should('be.checked');
    registerVersionPage.findFormField(FormFieldSelector.LOCATION_ENDPOINT).should('have.value', '');
    registerVersionPage.findFormField(FormFieldSelector.LOCATION_BUCKET).should('have.value', '');
    registerVersionPage.findFormField(FormFieldSelector.LOCATION_REGION).should('have.value', '');

    registerVersionPage.selectRegisteredModel('Test model 3 has version but is missing artifact');

    // Switching back should prefill them again
    registerVersionPage.selectRegisteredModel('Test model 1');
    cy.findByText('Current version is Version 1').should('exist');
    registerVersionPage
      .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT)
      .should('have.value', 'test model format');
    registerVersionPage
      .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
      .should('have.value', 'test version 1');
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE)
      .should('be.checked');
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_ENDPOINT)
      .should('have.value', 'test-endpoint-version-id-2');
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_BUCKET)
      .should('have.value', 'test-bucket-version-id-2');
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_REGION)
      .should('have.value', 'test-region-version-id-2');
  });

  it('Clears prefilled details if switching to a model with missing artifact', () => {
    registerVersionPage.selectRegisteredModel('Test model 1');
    registerVersionPage.selectRegisteredModel('Test model 3 has version but is missing artifact');
    registerVersionPage
      .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT)
      .should('have.value', '');
    registerVersionPage
      .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
      .should('have.value', '');
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE)
      .should('be.checked');
    registerVersionPage.findFormField(FormFieldSelector.LOCATION_ENDPOINT).should('have.value', '');
    registerVersionPage.findFormField(FormFieldSelector.LOCATION_BUCKET).should('have.value', '');
    registerVersionPage.findFormField(FormFieldSelector.LOCATION_REGION).should('have.value', '');
  });

  it('Clears prefilled details if switching to a model with missing version', () => {
    registerVersionPage.selectRegisteredModel('Test model 1');
    registerVersionPage.selectRegisteredModel('Test model 4 is missing version and artifact');
    registerVersionPage
      .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT)
      .should('have.value', '');
    registerVersionPage
      .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
      .should('have.value', '');
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE)
      .should('be.checked');
    registerVersionPage.findFormField(FormFieldSelector.LOCATION_ENDPOINT).should('have.value', '');
    registerVersionPage.findFormField(FormFieldSelector.LOCATION_BUCKET).should('have.value', '');
    registerVersionPage.findFormField(FormFieldSelector.LOCATION_REGION).should('have.value', '');
  });

  it('Disables submit until required fields are filled in object storage mode', () => {
    registerVersionPage.findSubmitButton().should('be.disabled');
    registerVersionPage.selectRegisteredModel('Test model 1');
    registerVersionPage.findFormField(FormFieldSelector.VERSION_NAME).type('Test version name');
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_PATH)
      .type('demo-models/flan-t5-small-caikit');
    registerVersionPage.findSubmitButton().should('be.enabled');
  });

  it('Creates expected resources on submit in object storage mode', () => {
    const veryLongName = 'Test name'.repeat(15); // A string over 128 characters
    registerVersionPage.selectRegisteredModel('Test model 1');
    registerVersionPage.findFormField(FormFieldSelector.VERSION_NAME).type('Test version name');
    registerVersionPage
      .findFormField(FormFieldSelector.VERSION_DESCRIPTION)
      .type('Test version description');
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_PATH)
      .type('demo-models/flan-t5-small-caikit');

    registerVersionPage.findFormField(FormFieldSelector.VERSION_NAME).clear().type(veryLongName);
    registerVersionPage.findSubmitButton().should('be.disabled');
    registerVersionPage
      .findFormField(FormFieldSelector.VERSION_NAME)
      .clear()
      .type('Test version name');

    registerVersionPage.findSubmitButton().should('be.enabled');
    registerVersionPage.findSubmitButton().click();

    cy.wait('@createModelVersion').then((interception) => {
      expect(interception.request.body).to.containSubset({
        data: {
          name: 'Test version name',
          description: 'Test version description',
          customProperties: {},
          state: ModelState.LIVE,
          author: 'user@example.com',
          registeredModelId: '1',
        },
      });
    });
    cy.wait('@createModelArtifact').then((interception) => {
      expect(interception.request.body).to.containSubset({
        data: {
          name: 'Test version name',
          description: 'Test version description',
          customProperties: {},
          state: ModelArtifactState.LIVE,
          author: 'user@example.com',
          modelFormatName: 'test model format',
          modelFormatVersion: 'test version 1',
          uri: 's3://test-bucket-version-id-2/demo-models/flan-t5-small-caikit?endpoint=test-endpoint-version-id-2&defaultRegion=test-region-version-id-2',
          artifactType: 'model-artifact',
        },
      });
    });

    cy.url().should('include', '/registry/modelregistry-sample/registered-models/1/versions');
  });

  it('Disables submit until required fields are filled in URI mode', () => {
    registerVersionPage.findSubmitButton().should('be.disabled');
    registerVersionPage.selectRegisteredModel('Test model 1');
    registerVersionPage.findFormField(FormFieldSelector.VERSION_NAME).type('Test version name');
    registerVersionPage.findFormField(FormFieldSelector.LOCATION_TYPE_URI).click();
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_URI)
      .type(
        's3://test-bucket/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1',
      );
    registerVersionPage.findSubmitButton().should('be.enabled');
  });

  it('Creates expected resources on submit in URI mode', () => {
    registerVersionPage.selectRegisteredModel('Test model 1');
    registerVersionPage.findFormField(FormFieldSelector.VERSION_NAME).type('Test version name');
    registerVersionPage
      .findFormField(FormFieldSelector.VERSION_DESCRIPTION)
      .type('Test version description');
    registerVersionPage.findFormField(FormFieldSelector.LOCATION_TYPE_URI).click();
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_URI)
      .type(
        's3://test-bucket/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1',
      );

    registerVersionPage.findSubmitButton().click();

    cy.wait('@createModelVersion').then((interception) => {
      expect(interception.request.body).to.containSubset({
        data: {
          name: 'Test version name',
          description: 'Test version description',
          customProperties: {},
          state: ModelState.LIVE,
          author: 'user@example.com',
          registeredModelId: '1',
        },
      });
    });
    cy.wait('@createModelArtifact').then((interception) => {
      expect(interception.request.body).to.containSubset({
        data: {
          name: 'Test version name',
          description: 'Test version description',
          customProperties: {},
          state: ModelArtifactState.LIVE,
          author: 'user@example.com',
          modelFormatName: 'test model format',
          modelFormatVersion: 'test version 1',
          uri: 's3://test-bucket/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1',
          artifactType: 'model-artifact',
        },
      });
    });

    cy.url().should('include', '/registry/modelregistry-sample/registered-models/1/versions');
  });
});

describe('Register model page with preselected model', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('Prefills version/artifact details for the preselected model', () => {
    registerVersionPage.visit('1');
    cy.findByText('Current version is Version 1').should('exist');
    registerVersionPage
      .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT)
      .should('have.value', 'test model format');
    registerVersionPage
      .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
      .should('have.value', 'test version 1');
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE)
      .should('be.checked');
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_ENDPOINT)
      .should('have.value', 'test-endpoint-version-id-2');
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_BUCKET)
      .should('have.value', 'test-bucket-version-id-2');
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_REGION)
      .should('have.value', 'test-region-version-id-2');
  });

  it('Does not prefill location fields if the URI on the artifact is malformed', () => {
    registerVersionPage.visit('2');
    registerVersionPage.findFormField(FormFieldSelector.LOCATION_ENDPOINT).should('have.value', '');
    registerVersionPage.findFormField(FormFieldSelector.LOCATION_BUCKET).should('have.value', '');
    registerVersionPage.findFormField(FormFieldSelector.LOCATION_REGION).should('have.value', '');
  });

  it('Disables submit until required fields are filled in object storage mode', () => {
    registerVersionPage.visit('1');
    registerVersionPage.findSubmitButton().should('be.disabled');
    registerVersionPage.findFormField(FormFieldSelector.VERSION_NAME).type('Test version name');
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_PATH)
      .type('demo-models/flan-t5-small-caikit');
    registerVersionPage.findSubmitButton().should('be.enabled');
  });

  it('Creates expected resources in object storage mode', () => {
    registerVersionPage.visit('1');
    registerVersionPage.findFormField(FormFieldSelector.VERSION_NAME).type('Test version name');
    registerVersionPage
      .findFormField(FormFieldSelector.VERSION_DESCRIPTION)
      .type('Test version description');
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_PATH)
      .type('demo-models/flan-t5-small-caikit');

    registerVersionPage.findSubmitButton().click();

    cy.wait('@createModelVersion').then((interception) => {
      expect(interception.request.body).to.containSubset({
        data: {
          name: 'Test version name',
          description: 'Test version description',
          customProperties: {},
          state: ModelState.LIVE,
          author: 'user@example.com',
          registeredModelId: '1',
        },
      });
    });
    cy.wait('@createModelArtifact').then((interception) => {
      expect(interception.request.body).to.containSubset({
        data: {
          name: 'Test version name',
          description: 'Test version description',
          customProperties: {},
          state: ModelArtifactState.LIVE,
          author: 'user@example.com',
          modelFormatName: 'test model format',
          modelFormatVersion: 'test version 1',
          uri: 's3://test-bucket-version-id-2/demo-models/flan-t5-small-caikit?endpoint=test-endpoint-version-id-2&defaultRegion=test-region-version-id-2',
          artifactType: 'model-artifact',
        },
      });
    });

    cy.url().should('include', '/registry/modelregistry-sample/registered-models/1/versions');
  });

  it('Disables submit until required fields are filled in URI mode', () => {
    registerVersionPage.visit('1');
    registerVersionPage.findSubmitButton().should('be.disabled');
    registerVersionPage.findFormField(FormFieldSelector.VERSION_NAME).type('Test version name');
    registerVersionPage.findFormField(FormFieldSelector.LOCATION_TYPE_URI).click();
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_URI)
      .type(
        's3://test-bucket/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1',
      );
    registerVersionPage.findSubmitButton().should('be.enabled');
  });

  it('Creates expected resources in URI mode', () => {
    registerVersionPage.visit('1');
    registerVersionPage.findFormField(FormFieldSelector.VERSION_NAME).type('Test version name');
    registerVersionPage
      .findFormField(FormFieldSelector.VERSION_DESCRIPTION)
      .type('Test version description');
    registerVersionPage.findFormField(FormFieldSelector.LOCATION_TYPE_URI).click();
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_URI)
      .type(
        's3://test-bucket/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1',
      );

    registerVersionPage.findSubmitButton().click();

    cy.wait('@createModelVersion').then((interception) => {
      expect(interception.request.body).to.containSubset({
        data: {
          name: 'Test version name',
          description: 'Test version description',
          customProperties: {},
          state: ModelState.LIVE,
          author: 'user@example.com',
          registeredModelId: '1',
        },
      });
    });
    cy.wait('@createModelArtifact').then((interception) => {
      expect(interception.request.body).to.containSubset({
        data: {
          name: 'Test version name',
          description: 'Test version description',
          customProperties: {},
          state: ModelArtifactState.LIVE,
          author: 'user@example.com',
          modelFormatName: 'test model format',
          modelFormatVersion: 'test version 1',
          uri: 's3://test-bucket/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1',
          artifactType: 'model-artifact',
        },
      });
    });

    cy.url().should('include', '/registry/modelregistry-sample/registered-models/1/versions');
  });
});
