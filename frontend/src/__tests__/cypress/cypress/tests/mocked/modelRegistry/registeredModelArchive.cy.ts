/* eslint-disable camelcase */
import { mockDscStatus, mockK8sResourceList } from '#~/__mocks__';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig';
import { mockRegisteredModelList } from '#~/__mocks__/mockRegisteredModelsList';
import { ServiceModel } from '#~/__tests__/cypress/cypress/utils/models';
import { mockModelVersion } from '#~/__mocks__/mockModelVersion';
import type { ModelVersion, RegisteredModel } from '#~/concepts/modelRegistry/types';
import { ModelRegistryMetadataType, ModelState } from '#~/concepts/modelRegistry/types';
import { mockRegisteredModel } from '#~/__mocks__/mockRegisteredModel';
import { verifyRelativeURL } from '#~/__tests__/cypress/cypress/utils/url';
import { labelModal, modelRegistry } from '#~/__tests__/cypress/cypress/pages/modelRegistry';
import {
  archiveModelModal,
  registeredModelArchive,
  restoreModelModal,
} from '#~/__tests__/cypress/cypress/pages/modelRegistry/registeredModelArchive';
import { mockModelVersionList } from '#~/__mocks__/mockModelVersionList';
import { mockModelRegistryService } from '#~/__mocks__/mockModelRegistryService';
import { be } from '#~/__tests__/cypress/cypress/utils/should';

const MODEL_REGISTRY_API_VERSION = 'v1alpha3';

type HandlersProps = {
  registeredModels?: RegisteredModel[];
  modelVersions?: ModelVersion[];
};

const initIntercepts = ({
  registeredModels = [
    mockRegisteredModel({
      name: 'model 1',
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
    mockRegisteredModel({
      id: '2',
      owner: 'Author 2',
      name: 'model 2',
      state: ModelState.ARCHIVED,
    }),
    mockRegisteredModel({ id: '3', name: 'model 3' }),
    mockRegisteredModel({ id: '4', name: 'model 4' }),
  ],
  modelVersions = [
    mockModelVersion({ author: 'Author 1', registeredModelId: '2' }),
    mockModelVersion({ name: 'model version' }),
  ],
}: HandlersProps) => {
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
        'model-registry-operator': true,
      },
    }),
  );
  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
      },
    },
    mockModelVersionList({ items: modelVersions }),
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
    mockRegisteredModelList({ items: registeredModels }),
  );

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        modelVersionId: 1,
      },
    },
    mockModelVersion({ id: '1', name: 'Version 2' }),
  );

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId/versions`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 2,
      },
    },
    mockModelVersionList({ items: modelVersions }),
  );

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 2,
      },
    },
    mockRegisteredModel({ id: '2', name: 'model 2', state: ModelState.ARCHIVED }),
  );

  cy.interceptOdh(
    'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId',
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 3,
      },
    },
    mockRegisteredModel({ id: '3', name: 'model 3' }),
  );
};

describe('Model archive list', () => {
  it('No archive models in the selected model registry', () => {
    initIntercepts({
      registeredModels: [],
    });
    registeredModelArchive.visit();
    verifyRelativeURL('/modelRegistry/modelregistry-sample/registeredModels/archive');
    registeredModelArchive.shouldArchiveVersionsEmpty();
  });

  it('Archived model details browser back button should lead to archived models table', () => {
    initIntercepts({});
    registeredModelArchive.visit();
    verifyRelativeURL('/modelRegistry/modelregistry-sample/registeredModels/archive');
    registeredModelArchive.findArchiveModelBreadcrumbItem().contains('Archived models');
    const archiveModelRow = registeredModelArchive.getRow('model 2');
    archiveModelRow.findName().contains('model 2').click();
    verifyRelativeURL('/modelRegistry/modelregistry-sample/registeredModels/archive/2/versions');
    cy.findByTestId('app-page-title').should('have.text', 'model 2Archived');
    cy.go('back');
    verifyRelativeURL('/modelRegistry/modelregistry-sample/registeredModels/archive');
    registeredModelArchive.findArchiveModelTable().should('be.visible');
  });

  it('Archived model with no versions', () => {
    initIntercepts({ modelVersions: [] });
    registeredModelArchive.visit();
    verifyRelativeURL('/modelRegistry/modelregistry-sample/registeredModels/archive');
    registeredModelArchive.findArchiveModelBreadcrumbItem().contains('Archived models');
    const archiveModelRow = registeredModelArchive.getRow('model 2');
    archiveModelRow.findName().contains('model 2').click();
    modelRegistry.shouldArchveModelVersionsEmpty();
  });

  it('Archived model flow', () => {
    initIntercepts({});
    registeredModelArchive.visitArchiveModelVersionList();
    verifyRelativeURL('/modelRegistry/modelregistry-sample/registeredModels/archive/2/versions');

    modelRegistry.findModelVersionsTable().should('be.visible');
    modelRegistry.findModelVersionsTableRows().should('have.length', 2);
    const version = modelRegistry.getModelVersionRow('model version');
    version.findModelVersionName().contains('model version').click();
    verifyRelativeURL(
      '/modelRegistry/modelregistry-sample/registeredModels/archive/2/versions/1/details',
    );
    cy.go('back');
    verifyRelativeURL('/modelRegistry/modelregistry-sample/registeredModels/archive/2/versions');
  });

  it('Archive models list', () => {
    initIntercepts({});
    registeredModelArchive.visit();
    verifyRelativeURL('/modelRegistry/modelregistry-sample/registeredModels/archive');

    //breadcrumb
    registeredModelArchive.findArchiveModelBreadcrumbItem().contains('Archived models');

    // name, last modified, owner, labels modal
    registeredModelArchive.findArchiveModelTable().should('be.visible');
    registeredModelArchive.findArchiveModelsTableRows().should('have.length', 2);

    const archiveModelRow = registeredModelArchive.getRow('model 1');

    archiveModelRow.findLabelModalText().contains('5 more');
    archiveModelRow.findLabelModalText().click();
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

    // sort by Last modified
    registeredModelArchive
      .findRegisteredModelsArchiveTableHeaderButton('Last modified')
      .should(be.sortAscending);
    registeredModelArchive.findRegisteredModelsArchiveTableHeaderButton('Last modified').click();
    registeredModelArchive
      .findRegisteredModelsArchiveTableHeaderButton('Last modified')
      .should(be.sortDescending);

    // sort by Model name
    registeredModelArchive.findRegisteredModelsArchiveTableHeaderButton('Model name').click();
    registeredModelArchive
      .findRegisteredModelsArchiveTableHeaderButton('Model name')
      .should(be.sortAscending);
    registeredModelArchive.findRegisteredModelsArchiveTableHeaderButton('Model name').click();
    registeredModelArchive
      .findRegisteredModelsArchiveTableHeaderButton('Model name')
      .should(be.sortDescending);
  });

  it('Filter by keyword then both', () => {
    initIntercepts({});
    registeredModelArchive.visit();
    registeredModelArchive.findTableSearch().type('model 1');
    registeredModelArchive.findArchiveModelsTableRows().should('have.length', 1);
    registeredModelArchive.findFilterDropdownItem('Owner').click();
    registeredModelArchive.findTableSearch().type('Author 1');
    registeredModelArchive.findArchiveModelsTableRows().should('have.length', 1);
    registeredModelArchive.findArchiveModelsTableRows().contains('model 1');
    registeredModelArchive.findTableSearch().type('2');
    registeredModelArchive.findArchiveModelsTableRows().should('have.length', 0);
  });

  it('Filter by owner then both', () => {
    initIntercepts({});
    registeredModelArchive.visit();
    registeredModelArchive.findFilterDropdownItem('Owner').click();
    registeredModelArchive.findTableSearch().type('Author 2');
    registeredModelArchive.findArchiveModelsTableRows().should('have.length', 1);
    registeredModelArchive.findFilterDropdownItem('Keyword').click();
    registeredModelArchive.findTableSearch().type('model 2');
    registeredModelArchive.findArchiveModelsTableRows().should('have.length', 1);
    registeredModelArchive.findTableSearch().type('.');
    registeredModelArchive.findArchiveModelsTableRows().should('have.length', 0);
  });
});

it('Opens the detail page when we select "View Details" from action menu', () => {
  initIntercepts({});
  registeredModelArchive.visit();
  const archiveModelRow = registeredModelArchive.getRow('model 2');
  archiveModelRow.findKebabAction('View details').click();
  cy.location('pathname').should(
    'be.equals',
    '/modelRegistry/modelregistry-sample/registeredModels/archive/2/details',
  );
});

describe('Restoring archive model', () => {
  it('Restore from archive models table', () => {
    cy.interceptOdh(
      'PATCH /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId',
      {
        path: {
          serviceName: 'modelregistry-sample',
          apiVersion: MODEL_REGISTRY_API_VERSION,
          registeredModelId: 2,
        },
      },
      mockRegisteredModel({ id: '2', name: 'model 2', state: ModelState.LIVE }),
    ).as('modelRestored');

    initIntercepts({});
    registeredModelArchive.visit();

    const archiveModelRow = registeredModelArchive.getRow('model 2');
    archiveModelRow.findKebabAction('Restore model').click();

    restoreModelModal.findRestoreButton().click();

    cy.wait('@modelRestored').then((interception) => {
      expect(interception.request.body).to.eql({
        state: 'LIVE',
      });
    });
  });

  it('Restore from archive model details', () => {
    cy.interceptOdh(
      'PATCH /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId',
      {
        path: {
          serviceName: 'modelregistry-sample',
          apiVersion: MODEL_REGISTRY_API_VERSION,
          registeredModelId: 2,
        },
      },
      mockRegisteredModel({ id: '2', name: 'model 2', state: ModelState.LIVE }),
    ).as('modelRestored');

    initIntercepts({});
    registeredModelArchive.visitArchiveModelDetail();

    registeredModelArchive.findRestoreButton().click();
    restoreModelModal.findRestoreButton().click();

    cy.wait('@modelRestored').then((interception) => {
      expect(interception.request.body).to.eql({
        state: 'LIVE',
      });
    });
  });
});

describe('Archiving model', () => {
  it('Archive model from registered models table', () => {
    cy.interceptOdh(
      'PATCH /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId',
      {
        path: {
          serviceName: 'modelregistry-sample',
          apiVersion: MODEL_REGISTRY_API_VERSION,
          registeredModelId: 3,
        },
      },
      mockRegisteredModel({ id: '3', name: 'model 3', state: ModelState.ARCHIVED }),
    ).as('modelArchived');

    initIntercepts({});
    registeredModelArchive.visitModelList();

    const modelRow = modelRegistry.getRow('model 3');
    modelRow.findKebabAction('Archive model').click();
    archiveModelModal.findArchiveButton().should('be.disabled');
    archiveModelModal.findModalTextInput().fill('model 3');
    archiveModelModal.findArchiveButton().should('be.enabled').click();
    cy.wait('@modelArchived').then((interception) => {
      expect(interception.request.body).to.eql({
        state: 'ARCHIVED',
      });
    });
  });

  it('Archive model from model details', () => {
    cy.interceptOdh(
      'PATCH /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId',
      {
        path: {
          serviceName: 'modelregistry-sample',
          apiVersion: MODEL_REGISTRY_API_VERSION,
          registeredModelId: 3,
        },
      },
      mockRegisteredModel({ id: '3', name: 'model 3', state: ModelState.ARCHIVED }),
    ).as('modelArchived');

    initIntercepts({});
    registeredModelArchive.visitModelList();

    const modelRow = modelRegistry.getRow('model 3');
    modelRow.findName().contains('model 3').click();
    registeredModelArchive
      .findModelVersionsDetailsHeaderAction()
      .findDropdownItem('Archive model')
      .click();

    archiveModelModal.findArchiveButton().should('be.disabled');
    archiveModelModal.findModalTextInput().fill('model 3');
    archiveModelModal.findArchiveButton().should('be.enabled').click();
    cy.wait('@modelArchived').then((interception) => {
      expect(interception.request.body).to.eql({
        state: 'ARCHIVED',
      });
    });
  });
});
