/* eslint-disable camelcase */
import { mockK8sResourceList } from '~/__mocks__';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockRegisteredModelList } from '~/__mocks__/mockRegisteredModelsList';
import { ServiceModel } from '~/__tests__/cypress/cypress/utils/models';
import { mockModelVersionList } from '~/__mocks__/mockModelVersionList';
import { mockModelVersion } from '~/__mocks__/mockModelVersion';
import type { ModelVersion } from '~/concepts/modelRegistry/types';
import { ModelState } from '~/concepts/modelRegistry/types';
import { mockRegisteredModel } from '~/__mocks__/mockRegisteredModel';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url';
import {
  archiveVersionModal,
  modelVersionArchive,
  restoreVersionModal,
} from '~/__tests__/cypress/cypress/pages/modelRegistry/modelVersionArchive';
import { labelModal, modelRegistry } from '~/__tests__/cypress/cypress/pages/modelRegistry';
import { mockModelRegistryService } from '~/__mocks__/mockModelRegistryService';

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
      labels: [
        'Financial data',
        'Fraud detection',
        'Test label',
        'Machine learning',
        'Next data to be overflow',
        'Test label x',
        'Test label y',
        'Test label z',
      ],
      state: ModelState.ARCHIVED,
    }),
    mockModelVersion({ id: '2', name: 'model version 2', state: ModelState.ARCHIVED }),
    mockModelVersion({ id: '3', name: 'model version 3' }),
  ],
}: HandlersProps) => {
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
    archiveVersionRow.findKebabAction('Restore version').click();

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
      .findDropdownItem('Archive version')
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
