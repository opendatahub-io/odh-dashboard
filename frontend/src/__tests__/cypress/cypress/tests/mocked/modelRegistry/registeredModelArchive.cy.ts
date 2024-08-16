/* eslint-disable camelcase */
import { mockK8sResourceList } from '~/__mocks__';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockRegisteredModelList } from '~/__mocks__/mockRegisteredModelsList';
import { ServiceModel } from '~/__tests__/cypress/cypress/utils/models';
import { mockModelVersion } from '~/__mocks__/mockModelVersion';
import type { ModelVersion, RegisteredModel } from '~/concepts/modelRegistry/types';
import { ModelState } from '~/concepts/modelRegistry/types';
import { mockRegisteredModel } from '~/__mocks__/mockRegisteredModel';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url';
import { labelModal, modelRegistry } from '~/__tests__/cypress/cypress/pages/modelRegistry';
import {
  archiveModelModal,
  registeredModelArchive,
  restoreModelModal,
} from '~/__tests__/cypress/cypress/pages/modelRegistry/registeredModelArchive';
import { mockModelVersionList } from '~/__mocks__/mockModelVersionList';
import { mockModelRegistryService } from '~/__mocks__/mockModelRegistryService';

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
    mockRegisteredModel({ id: '2', name: 'model 2', state: ModelState.ARCHIVED }),
    mockRegisteredModel({ id: '3', name: 'model 3' }),
    mockRegisteredModel({ id: '4', name: 'model 4' }),
  ],
  modelVersions = [
    mockModelVersion({ author: 'Author 1' }),
    mockModelVersion({ name: 'model version' }),
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
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models`,
    {
      path: { serviceName: 'modelregistry-sample', apiVersion: MODEL_REGISTRY_API_VERSION },
    },
    mockRegisteredModelList({ items: registeredModels }),
  );

  cy.interceptOdh(
    `GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId/versions`,
    {
      path: {
        serviceName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
        registeredModelId: 1,
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
  });
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

    // Bypass patternfly ExpandableSection error https://github.com/patternfly/patternfly-react/issues/10410
    // Cannot destructure property 'offsetWidth' of 'this.expandableContentRef.current' as it is null.
    Cypress.on('uncaught:exception', () => false);

    const archiveModelRow = registeredModelArchive.getRow('model 2');
    archiveModelRow.findKebabAction('Restore model').click();

    restoreModelModal.findRestoreButton().click();

    cy.wait('@modelRestored').then((interception) => {
      expect(interception.request.body).to.eql({
        customProperties: {},
        description: '',
        externalID: '1234132asdfasdf',
        state: 'LIVE',
        owner: 'Author 1',
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
        customProperties: {},
        description: '',
        externalID: '1234132asdfasdf',
        state: 'LIVE',
        owner: 'Author 1',
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
        customProperties: {},
        description: '',
        externalID: '1234132asdfasdf',
        state: 'ARCHIVED',
        owner: 'Author 1',
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
          registeredModelId: 2,
        },
      },
      mockRegisteredModel({ id: '2', name: 'model 2', state: ModelState.ARCHIVED }),
    ).as('modelArchived');

    initIntercepts({});
    registeredModelArchive.visitModelDetails();
    registeredModelArchive
      .findModelVersionsDetailsHeaderAction()
      .findDropdownItem('Archive model')
      .click();

    archiveModelModal.findArchiveButton().should('be.disabled');
    archiveModelModal.findModalTextInput().fill('model 2');
    archiveModelModal.findArchiveButton().should('be.enabled').click();
    cy.wait('@modelArchived').then((interception) => {
      expect(interception.request.body).to.eql({
        customProperties: {},
        description: '',
        externalID: '1234132asdfasdf',
        state: 'ARCHIVED',
        owner: 'Author 1',
      });
    });
  });
});
