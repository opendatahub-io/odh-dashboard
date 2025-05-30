/* eslint-disable camelcase */
import {
  mockDscStatus,
  mockInferenceServiceK8sResource,
  mockK8sResourceList,
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
import { verifyRelativeURL } from '#~/__tests__/cypress/cypress/utils/url';
import {
  archiveVersionModal,
  modelVersionArchive,
  restoreVersionModal,
} from '#~/__tests__/cypress/cypress/pages/modelRegistry/modelVersionArchive';
import { labelModal, modelRegistry } from '#~/__tests__/cypress/cypress/pages/modelRegistry';
import { mockModelRegistryService } from '#~/__mocks__/mockModelRegistryService';
import { KnownLabels } from '#~/k8sTypes';

const MODEL_REGISTRY_API_VERSION = 'v1alpha3';

type HandlersProps = {
  registeredModelsSize?: number;
  modelVersions?: ModelVersion[];
};

const initIntercepts = ({
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
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models',
    { path: { serviceName: 'modelregistry-sample', apiVersion: MODEL_REGISTRY_API_VERSION } },
    mockRegisteredModelList({ size: registeredModelsSize }),
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
      items: modelVersions,
    }),
  );

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
      },
    },
    mockRegisteredModel({ name: 'test-1' }),
  );

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 2,
      },
    },
    mockModelVersion({ id: '2', name: 'model version 2', state: ModelState.ARCHIVED }),
  );

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 3,
      },
    },
    mockModelVersion({ id: '3', name: 'model version 3', state: ModelState.LIVE }),
  );
};

describe('Model version archive list', () => {
  it('No archive versions in the selected registered model', () => {
    initIntercepts({ modelVersions: [mockModelVersion({ id: '3', name: 'model version 2' })] });
    modelVersionArchive.visitModelVersionList();
    verifyRelativeURL('/modelRegistry/modelregistry-sample/registeredModels/1/versions');
    modelVersionArchive
      .findModelVersionsTableKebab()
      .findDropdownItem('View archived versions')
      .click();
    modelVersionArchive.shouldArchiveVersionsEmpty();
  });

  it('Archived version details browser back button should lead to archived versions table', () => {
    initIntercepts({});
    modelVersionArchive.visit();
    verifyRelativeURL('/modelRegistry/modelregistry-sample/registeredModels/1/versions/archive');
    modelVersionArchive.findArchiveVersionBreadcrumbItem().contains('Archived version');
    const archiveVersionRow = modelVersionArchive.getRow('model version 2');
    archiveVersionRow.findName().contains('model version 2').click();
    verifyRelativeURL(
      '/modelRegistry/modelregistry-sample/registeredModels/1/versions/archive/2/details',
    );
    cy.go('back');
    verifyRelativeURL('/modelRegistry/modelregistry-sample/registeredModels/1/versions/archive');
    modelVersionArchive.findArchiveVersionBreadcrumbItem().contains('Archived version');
    archiveVersionRow.findName().contains('model version 2').should('exist');
  });

  it('Archive version list', () => {
    initIntercepts({});
    modelVersionArchive.visit();
    verifyRelativeURL('/modelRegistry/modelregistry-sample/registeredModels/1/versions/archive');

    //breadcrumb
    modelVersionArchive.findArchiveVersionBreadcrumbItem().contains('Archived version');

    // name, last modified, owner, labels modal
    modelVersionArchive.findArchiveVersionTable().should('be.visible');
    modelVersionArchive.findArchiveVersionsTableRows().should('have.length', 2);

    const archiveVersionRow = modelVersionArchive.getRow('model version 1');

    archiveVersionRow.findLabelModalText().contains('5 more');
    archiveVersionRow.findLabelModalText().click();
    labelModal.shouldContainsModalLabels([
      'Financial',
      'Financial data',
      'Fraud detection',
      'Test label',
      'Machine learning',
      'Next data to be overflow',
      'Test label x',
      'Test label y',
      'Test label y',
    ]);
    labelModal.findCloseModal().click();
  });
});

describe('Restoring archive version', () => {
  it('Restore from archive table', () => {
    cy.interceptOdh(
      'PATCH /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId',
      {
        path: {
          serviceName: 'modelregistry-sample',
          apiVersion: MODEL_REGISTRY_API_VERSION,
          modelVersionId: 2,
        },
      },
      mockModelVersion({}),
    ).as('versionRestored');

    initIntercepts({});
    modelVersionArchive.visit();

    const archiveVersionRow = modelVersionArchive.getRow('model version 2');
    archiveVersionRow.findKebabAction('Restore model version').click();

    restoreVersionModal.findRestoreButton().click();

    cy.wait('@versionRestored').then((interception) => {
      expect(interception.request.body).to.eql({
        state: 'LIVE',
      });
    });
  });

  it('Restore from archive version details', () => {
    cy.interceptOdh(
      'PATCH /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId',
      {
        path: {
          serviceName: 'modelregistry-sample',
          apiVersion: MODEL_REGISTRY_API_VERSION,
          modelVersionId: 2,
        },
      },
      mockModelVersion({}),
    ).as('versionRestored');

    initIntercepts({});
    modelVersionArchive.visitArchiveVersionDetail();

    modelVersionArchive.findRestoreButton().click();
    restoreVersionModal.findRestoreButton().click();

    cy.wait('@versionRestored').then((interception) => {
      expect(interception.request.body).to.eql({
        state: 'LIVE',
      });
    });
  });
});

describe('Archiving version', () => {
  it('Archive version from versions table', () => {
    cy.interceptOdh(
      'PATCH /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId',
      {
        path: {
          serviceName: 'modelregistry-sample',
          apiVersion: MODEL_REGISTRY_API_VERSION,
          modelVersionId: 3,
        },
      },
      mockModelVersion({}),
    ).as('versionArchived');

    initIntercepts({});
    modelVersionArchive.visitModelVersionList();

    const modelVersionRow = modelRegistry.getModelVersionRow('model version 3');
    modelVersionRow.findKebabAction('Archive model version').click();
    archiveVersionModal.findArchiveButton().should('be.disabled');
    archiveVersionModal.findModalTextInput().fill('model version 3');
    archiveVersionModal.findArchiveButton().should('be.enabled').click();
    cy.wait('@versionArchived').then((interception) => {
      expect(interception.request.body).to.eql({
        state: 'ARCHIVED',
      });
    });
  });

  it('Non archived version details page has the Deployments tab', () => {
    initIntercepts({});
    modelVersionArchive.visitModelVersionDetails();
    modelVersionArchive.findVersionDetailsTab().should('exist');
    modelVersionArchive.findVersionDeploymentTab().should('exist');
  });

  it('Archived version details page does not have the Deployments tab', () => {
    initIntercepts({});
    modelVersionArchive.visitArchiveVersionDetail();
    modelVersionArchive.findVersionDetailsTab().should('exist');
    modelVersionArchive.findVersionDeploymentTab().should('not.exist');
  });

  it('Cannot archive version that has a deployment from versions table', () => {
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

  it('Cannot archive model that has versions with a deployment', () => {
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

  it('Cannot archive model version with deployment from the version detail page', () => {
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

  it('Archive version from versions details', () => {
    cy.interceptOdh(
      'PATCH /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId',
      {
        path: {
          serviceName: 'modelregistry-sample',
          apiVersion: MODEL_REGISTRY_API_VERSION,
          modelVersionId: 3,
        },
      },
      mockModelVersion({}),
    ).as('versionArchived');

    initIntercepts({});
    modelVersionArchive.visitModelVersionDetails();
    modelVersionArchive
      .findModelVersionsDetailsHeaderAction()
      .findDropdownItem('Archive model version')
      .click();

    archiveVersionModal.findArchiveButton().should('be.disabled');
    archiveVersionModal.findModalTextInput().fill('model version 3');
    archiveVersionModal.findArchiveButton().should('be.enabled').click();
    cy.wait('@versionArchived').then((interception) => {
      expect(interception.request.body).to.eql({
        state: 'ARCHIVED',
      });
    });
  });
});
