/* eslint-disable camelcase */
import {
  mockDscStatus,
  mockInferenceServiceK8sResource,
  mockK8sResourceList,
  mockModelArtifactList,
  mockProjectK8sResource,
} from '#~/__mocks__';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { mockRegisteredModelList } from '#~/__mocks__/mockRegisteredModelsList';
import {
  InferenceServiceModel,
  ProjectModel,
  ServiceModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import { mockModelVersionList } from '#~/__mocks__/mockModelVersionList';
import { mockModelVersion } from '#~/__mocks__/mockModelVersion';
import type { ModelVersion } from '#~/concepts/modelRegistry/types';
import { ModelRegistryMetadataType, ModelState } from '#~/concepts/modelRegistry/types';
import { mockRegisteredModel } from '#~/__mocks__/mockRegisteredModel';
import { modelVersionArchive } from '#~/__tests__/cypress/cypress/pages/modelRegistry/modelVersionArchive';
import { modelRegistry } from '#~/__tests__/cypress/cypress/pages/modelRegistry';
import { mockModelRegistry, mockModelRegistryService } from '#~/__mocks__/mockModelRegistryService';
import { KnownLabels } from '#~/k8sTypes';

const MODEL_REGISTRY_API_VERSION = 'v1';

type HandlersProps = {
  registeredModelsSize?: number;
  modelVersions?: ModelVersion[];
};

const initIntercepts = ({
  // TODO: Investigate if this line is needed.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  registeredModelsSize = 4,
  modelVersions = [
    mockModelVersion({
      name: 'model version 1',
      author: 'Author 1',
      id: '1',
      customProperties: {
        'Financial data': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Fraud detection': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Test label': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Machine learning': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Next data to be overflow': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Test label x': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Test label y': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
        'Test label z': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
      },
      state: ModelState.ARCHIVED,
    }),
    mockModelVersion({ id: '2', name: 'model version 2', state: ModelState.ARCHIVED }),
    mockModelVersion({ id: '3', name: 'model version 3' }),
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
      disableModelRegistry: false,
    }),
  );

  cy.interceptK8sList(
    ServiceModel,
    mockK8sResourceList([
      mockModelRegistryService({ name: 'modelregistry-sample' }),
      mockModelRegistryService({ name: 'modelregistry-sample-2' }),
    ]),
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
    { data: mockRegisteredModelList({ items: [mockRegisteredModel({ name: 'test-1' })] }) },
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
        items: modelVersions,
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
    { data: mockRegisteredModel({ name: 'test-1' }) },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 2,
      },
    },
    { data: mockModelVersion({ id: '2', name: 'model version 2', state: ModelState.ARCHIVED }) },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 3,
      },
    },
    { data: mockModelVersion({ id: '3', name: 'model version 3', state: ModelState.LIVE }) },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions/:modelVersionId/artifacts`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 3,
      },
    },
    { data: mockModelArtifactList({}) },
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

describe('Archiving version', () => {
  it('Non archived version details page has the Deployments tab', () => {
    initIntercepts({});
    modelVersionArchive.visitModelVersionDetails();
    modelVersionArchive.findVersionDetailsTab().should('exist');
    modelVersionArchive.findVersionDeploymentTab().should('exist');
  });

  // TODO: Fix this test
  it.skip('Archived version details page does not have the Deployments tab', () => {
    initIntercepts({});
    modelVersionArchive.visitArchiveVersionDetail();
    modelVersionArchive.findVersionDetailsTab().should('exist');
    modelVersionArchive.findVersionDeploymentTab().should('not.exist');
  });

  // TODO: Fix this test
  it.skip('Cannot archive version that has a deployment from versions table', () => {
    cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
    cy.interceptK8sList(
      InferenceServiceModel,
      mockK8sResourceList([
        mockInferenceServiceK8sResource({
          additionalLabels: {
            [KnownLabels.REGISTERED_MODEL_ID]: '1',
            [KnownLabels.MODEL_VERSION_ID]: '3',
          },
        }),
      ]),
    );
    initIntercepts({});

    modelVersionArchive.visitModelVersionList();

    const modelVersionRow = modelRegistry.getModelVersionRow('model version 3');
    modelVersionRow.findKebabAction('Archive model version').should('have.attr', 'aria-disabled');
  });

  // TODO: Fix this test
  it.skip('Cannot archive model that has versions with a deployment', () => {
    cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
    cy.interceptK8sList(
      InferenceServiceModel,
      mockK8sResourceList([mockInferenceServiceK8sResource({})]),
    );
    initIntercepts({});

    modelVersionArchive.visitModelVersionList();

    modelRegistry
      .findModelVersionsHeaderAction()
      .findDropdownItem('Archive model')
      .should('have.attr', 'aria-disabled');
  });

  // TODO: Fix this test
  it.skip('Cannot archive model version with deployment from the version detail page', () => {
    cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
    cy.interceptK8sList(
      InferenceServiceModel,
      mockK8sResourceList([mockInferenceServiceK8sResource({})]),
    );
    initIntercepts({});
    modelVersionArchive.visitModelVersionDetails();
    cy.findByTestId('model-version-details-action-button')
      .findDropdownItem('Archive model version')
      .should('have.attr', 'aria-disabled');
  });
});
