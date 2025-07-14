import { mockDashboardConfig, mockDscStatus, mockK8sResourceList } from '#~/__mocks__';
import { mockDsciStatus } from '#~/__mocks__/mockDsciStatus';
import { StackComponent } from '#~/concepts/areas/types';
import { ServiceModel } from '#~/__tests__/cypress/cypress/utils/models';
import {
  FormFieldSelector,
  registerVersionPage,
} from '#~/__tests__/cypress/cypress/pages/modelRegistry/registerVersionPage';
import { mockRegisteredModel } from '#~/__mocks__/mockRegisteredModel';
import { mockModelVersion } from '#~/__mocks__/mockModelVersion';
import { mockModelArtifact } from '#~/__mocks__/mockModelArtifact';
import { mockModelRegistryService } from '#~/__mocks__/mockModelRegistryService';
import { mockRegisteredModelList } from '#~/__mocks__/mockRegisteredModelsList';
import { mockModelVersionList } from '#~/__mocks__/mockModelVersionList';
import { mockModelArtifactList } from '#~/__mocks__/mockModelArtifactList';
import {
  ModelArtifactState,
  ModelState,
  type ModelVersion,
  type ModelArtifact,
} from '#~/concepts/modelRegistry/types';

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
  cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({}));

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
        mockRegisteredModel({ id: '1', name: 'Test model 1' }),
        mockRegisteredModel({ id: '2', name: 'Test model 2' }),
        mockRegisteredModel({ id: '3', name: 'Test model 3 has version but is missing artifact' }),
        mockRegisteredModel({ id: '4', name: 'Test model 4 is missing version and artifact' }),
      ],
    }),
  );

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId/versions',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    mockModelVersionList({
      items: [
        mockModelVersion({
          id: '1',
          registeredModelId: '1',
          name: 'Test older version for model 1',
          createTimeSinceEpoch: '1712234877179', // Apr 04 2024
        }),
        mockModelVersion({
          id: '2',
          registeredModelId: '1',
          name: 'Test latest version for model 1',
          createTimeSinceEpoch: '1723659611927', // Aug 14 2024
        }),
      ],
    }),
  );

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId/versions',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 2,
      },
    },
    mockModelVersionList({
      items: [
        mockModelVersion({
          id: '3',
          registeredModelId: '2',
          name: 'Test older version for model 2',
          createTimeSinceEpoch: '1712234877179', // Apr 04 2024
        }),
        mockModelVersion({
          id: '4',
          registeredModelId: '2',
          name: 'Test latest version for model 2',
          createTimeSinceEpoch: '1723659611927', // Aug 14 2024
        }),
      ],
    }),
  );

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId/versions',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 3,
      },
    },
    mockModelVersionList({
      items: [
        mockModelVersion({
          id: '5',
          registeredModelId: '3',
          name: 'Test version for model 3',
        }),
      ],
    }),
  );

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId/versions',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 4,
      },
    },
    mockModelVersionList({
      items: [], // Model 4 has no versions
    }),
  );

  // Model id 1's latest version is id 2
  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 2,
      },
    },
    mockModelArtifactList({
      items: [
        mockModelArtifact({
          modelFormatName: 'test-version-id-2-format-name',
          modelFormatVersion: 'test-version-id-2-format-version',
          uri: 's3://test-bucket-version-id-2/demo-models/test-path?endpoint=test-endpoint-version-id-2&defaultRegion=test-region-version-id-2',
        }),
      ],
    }),
  );

  // Model id 2's latest version is id 4
  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 4,
      },
    },
    mockModelArtifactList({
      items: [
        mockModelArtifact({
          modelFormatName: 'test-version-id-4-format-name',
          modelFormatVersion: 'test-version-id-4-format-version',
          uri: 'oops-malformed-uri',
        }),
      ],
    }),
  );

  // Model id 3's latest version is id 5
  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 5,
      },
    },
    mockModelArtifactList({
      items: [], // Model 3 has no artifacts
    }),
  );

  cy.interceptOdh(
    'POST /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId/versions',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    mockModelVersion({ id: '6', name: 'Test version name' }),
  ).as('createModelVersion');

  cy.interceptOdh(
    'POST /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 6,
      },
    },
    mockModelArtifact(),
  ).as('createModelArtifact');

  // Add intercepts for timestamp updates
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
        modelVersionId: '6',
      },
    },
    mockModelVersion({ id: '6', name: 'Test version name' }),
  ).as('updateModelVersion');
};

describe('Register model page with no preselected model', () => {
  beforeEach(() => {
    initIntercepts();
    registerVersionPage.visit();
  });

  it('Prefills version/artifact details when a model is selected', () => {
    registerVersionPage.selectRegisteredModel('Test model 1');
    cy.findByText('Current version is Test latest version for model 1').should('exist');
    registerVersionPage
      .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT)
      .should('have.value', 'test-version-id-2-format-name');
    registerVersionPage
      .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
      .should('have.value', 'test-version-id-2-format-version');
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
    cy.findByText('Current version is Test latest version for model 2').should('exist');
    registerVersionPage
      .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT)
      .should('have.value', 'test-version-id-4-format-name');
    registerVersionPage
      .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
      .should('have.value', 'test-version-id-4-format-version');
    registerVersionPage
      .findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE)
      .should('be.checked');
    registerVersionPage.findFormField(FormFieldSelector.LOCATION_ENDPOINT).should('have.value', '');
    registerVersionPage.findFormField(FormFieldSelector.LOCATION_BUCKET).should('have.value', '');
    registerVersionPage.findFormField(FormFieldSelector.LOCATION_REGION).should('have.value', '');

    // Switching back should prefill them again
    registerVersionPage.selectRegisteredModel('Test model 1');
    cy.findByText('Current version is Test latest version for model 1').should('exist');
    registerVersionPage
      .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT)
      .should('have.value', 'test-version-id-2-format-name');
    registerVersionPage
      .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
      .should('have.value', 'test-version-id-2-format-version');
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
        modelFormatName: 'test-version-id-2-format-name',
        modelFormatVersion: 'test-version-id-2-format-version',
        uri: 's3://test-bucket-version-id-2/demo-models/flan-t5-small-caikit?endpoint=test-endpoint-version-id-2&defaultRegion=test-region-version-id-2',
        artifactType: 'model-artifact',
      } satisfies Partial<ModelArtifact>);
    });

    cy.url().should('include', '/modelRegistry/modelregistry-sample/registeredModels/1/versions');
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
        modelFormatName: 'test-version-id-2-format-name',
        modelFormatVersion: 'test-version-id-2-format-version',
        uri: 's3://test-bucket/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1',
        artifactType: 'model-artifact',
      } satisfies Partial<ModelArtifact>);
    });

    cy.url().should('include', '/modelRegistry/modelregistry-sample/registeredModels/1/versions');
  });
});

describe('Register model page with preselected model', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('Prefills version/artifact details for the preselected model', () => {
    registerVersionPage.visit('1');
    cy.findByText('Current version is Test latest version for model 1').should('exist');
    registerVersionPage
      .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT)
      .should('have.value', 'test-version-id-2-format-name');
    registerVersionPage
      .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
      .should('have.value', 'test-version-id-2-format-version');
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
        modelFormatName: 'test-version-id-2-format-name',
        modelFormatVersion: 'test-version-id-2-format-version',
        uri: 's3://test-bucket-version-id-2/demo-models/flan-t5-small-caikit?endpoint=test-endpoint-version-id-2&defaultRegion=test-region-version-id-2',
        artifactType: 'model-artifact',
      } satisfies Partial<ModelArtifact>);
    });

    cy.url().should('include', '/modelRegistry/modelregistry-sample/registeredModels/1/versions');
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
        modelFormatName: 'test-version-id-2-format-name',
        modelFormatVersion: 'test-version-id-2-format-version',
        uri: 's3://test-bucket/demo-models/flan-t5-small-caikit?endpoint=http%3A%2F%2Fs3.amazonaws.com%2F&defaultRegion=us-east-1',
        artifactType: 'model-artifact',
      } satisfies Partial<ModelArtifact>);
    });

    cy.url().should('include', '/modelRegistry/modelregistry-sample/registeredModels/1/versions');
  });
});
