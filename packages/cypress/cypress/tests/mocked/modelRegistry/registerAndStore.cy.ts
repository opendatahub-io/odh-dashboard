// These tests cover ODH-specific behavior in the Register and Store form,
// specifically the project selector extension that replaces the upstream namespace selector.
// For upstream register-and-store tests (namespace selector, form submission, transfer jobs, etc.), see:
//   packages/model-registry/upstream/frontend/src/__tests__/cypress/cypress/tests/mocked/modelRegistry/registerAndStoreFields.cy.ts

import {
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
  mockModelVersionList,
  mockProjectK8sResource,
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
import { registerAndStorePage } from '../../../pages/modelRegistry/registerAndStorePage';
import { ProjectModel, ServiceModel } from '../../../utils/models';

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
        [DataScienceStackComponent.MODEL_REGISTRY]: {
          managementState: 'Managed',
          registriesNamespace: 'odh-model-registries',
        },
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
    `GET /model-registry/api/:apiVersion/namespaces`,
    { path: { apiVersion: MODEL_REGISTRY_API_VERSION } },
    { data: [{ metadata: { name: 'odh-model-registries' } }] },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/user`,
    { path: { apiVersion: MODEL_REGISTRY_API_VERSION } },
    { data: { userId: 'user@example.com', clusterAdmin: true } },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry`,
    { path: { apiVersion: MODEL_REGISTRY_API_VERSION } },
    { data: [mockModelRegistry({ name: 'modelregistry-sample' })] },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/model_versions`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
      },
    },
    {
      data: mockModelVersionList({
        items: [mockModelVersion({ name: 'model version', registeredModelId: '1' })],
      }),
    },
  );

  cy.interceptOdh(
    `GET /model-registry/api/:apiVersion/model_registry/:modelRegistryName/registered_models`,
    {
      path: {
        modelRegistryName: 'modelregistry-sample',
        apiVersion: MODEL_REGISTRY_API_VERSION,
      },
    },
    { data: mockRegisteredModelList({ items: [mockRegisteredModel({ name: 'model' })] }) },
  );
};

describe('Register and Store - ODH Project Selector', () => {
  describe('Toggle behavior', () => {
    beforeEach(() => {
      initIntercepts();
      registerAndStorePage.visit();
    });

    it('Should show project selector with "Project" label when Register and store is selected', () => {
      registerAndStorePage.findNamespaceFormGroup().should('not.exist');
      registerAndStorePage.selectRegisterAndStoreMode();
      registerAndStorePage.findNamespaceFormGroup().should('exist');
      registerAndStorePage.findNamespaceFormGroup().contains('Project');
      registerAndStorePage.findProjectSelectorToggle().should('exist');
    });

    it('Should hide project selector when switching back to Register mode', () => {
      registerAndStorePage.selectRegisterAndStoreMode();
      registerAndStorePage.findNamespaceFormGroup().should('exist');
      cy.findByTestId('registration-mode-register').click();
      registerAndStorePage.findNamespaceFormGroup().should('not.exist');
    });
  });

  describe('Project selection and access check', () => {
    beforeEach(() => {
      initIntercepts();
      cy.intercept('POST', '**/api/v1/check-namespace-registry-access', {
        statusCode: 200,
        body: { data: { hasAccess: true } },
      }).as('checkAccess');
      registerAndStorePage.visit();
      registerAndStorePage.selectRegisterAndStoreMode();
    });

    it('Should show projects from ProjectsContext in dropdown', () => {
      registerAndStorePage.findProjectSelectorToggle().click();
      cy.findByRole('menuitem', { name: 'Test Project' }).should('exist');
      cy.findByRole('menuitem', { name: 'Test Project 2' }).should('exist');
    });

    it('Should show form sections after selecting a project with access', () => {
      cy.findByTestId('model-origin-location-section').should('not.exist');
      cy.findByTestId('model-destination-location-section').should('not.exist');
      registerAndStorePage.selectProject('Test Project');
      cy.wait('@checkAccess');
      cy.findByTestId('model-origin-location-section').should('exist');
      cy.findByTestId('model-destination-location-section').should('exist');
    });
  });

  describe('No access warning', () => {
    beforeEach(() => {
      initIntercepts();
      cy.intercept('POST', '**/api/v1/check-namespace-registry-access', {
        statusCode: 200,
        body: { data: { hasAccess: false } },
      }).as('checkAccess');
      registerAndStorePage.visit();
      registerAndStorePage.selectRegisterAndStoreMode();
    });

    it('Should show warning with "project" wording when project has no access', () => {
      registerAndStorePage.selectProject('Test Project');
      cy.wait('@checkAccess');
      registerAndStorePage.findNoAccessAlert().should('exist');
      registerAndStorePage
        .findNoAccessAlert()
        .should('contain.text', 'The selected project does not have access to this model registry');
    });

    it('Should hide form sections when project has no access', () => {
      registerAndStorePage.selectProject('Test Project');
      cy.wait('@checkAccess');
      cy.findByTestId('model-origin-location-section').should('not.exist');
      cy.findByTestId('model-destination-location-section').should('not.exist');
    });

    it('Should show "Who is my admin" link in no-access warning', () => {
      registerAndStorePage.selectProject('Test Project');
      cy.wait('@checkAccess');
      registerAndStorePage.findWhoIsMyAdminTrigger().should('exist');
    });

    it('Should keep submit button disabled when project has no access', () => {
      registerAndStorePage.selectProject('Test Project');
      cy.wait('@checkAccess');
      registerAndStorePage.findSubmitButton().should('be.disabled');
    });
  });

  describe('Cannot check access (non-admin user)', () => {
    beforeEach(() => {
      initIntercepts();
      cy.intercept('POST', '**/api/v1/check-namespace-registry-access', {
        statusCode: 200,
        body: { data: { hasAccess: false, cannotCheck: true } },
      }).as('checkAccessCannotCheck');
      registerAndStorePage.visit();
      registerAndStorePage.selectRegisterAndStoreMode();
    });

    it('Should show info alert with "project" wording when user cannot check access', () => {
      registerAndStorePage.selectProject('Test Project');
      cy.wait('@checkAccessCannotCheck');
      registerAndStorePage.findCannotCheckAlert().should('exist');
      registerAndStorePage
        .findCannotCheckAlert()
        .should(
          'contain.text',
          'Make sure this project has access to the modelregistry-sample registry',
        );
    });

    it('Should not show the no-access warning when cannotCheck is true', () => {
      registerAndStorePage.selectProject('Test Project');
      cy.wait('@checkAccessCannotCheck');
      registerAndStorePage.findNoAccessAlert().should('not.exist');
    });

    it('Should show form sections when cannotCheck is true', () => {
      registerAndStorePage.selectProject('Test Project');
      cy.wait('@checkAccessCannotCheck');
      cy.findByTestId('model-origin-location-section').should('exist');
      cy.findByTestId('model-destination-location-section').should('exist');
    });
  });

  describe('Access check error', () => {
    beforeEach(() => {
      initIntercepts();
      cy.intercept('POST', '**/api/v1/check-namespace-registry-access', {
        statusCode: 500,
        body: { error: 'failed to check access' },
      }).as('checkAccessError');
      registerAndStorePage.visit();
      registerAndStorePage.selectRegisterAndStoreMode();
    });

    it('Should show error alert when access check fails', () => {
      registerAndStorePage.selectProject('Test Project');
      cy.wait('@checkAccessError');
      registerAndStorePage.findAccessCheckError().should('exist');
    });

    it('Should hide form sections when access check fails', () => {
      registerAndStorePage.selectProject('Test Project');
      cy.wait('@checkAccessError');
      cy.findByTestId('model-origin-location-section').should('not.exist');
      cy.findByTestId('model-destination-location-section').should('not.exist');
    });
  });

  describe('No projects available', () => {
    it('Should show no-projects warning when user has no projects', () => {
      initIntercepts();
      // Override projects to empty list
      cy.interceptK8sList(ProjectModel, mockK8sResourceList([]));
      registerAndStorePage.visit();
      registerAndStorePage.selectRegisterAndStoreMode();
      registerAndStorePage.findNoAccessAlert().should('exist');
      registerAndStorePage
        .findNoAccessAlert()
        .should('contain.text', 'You do not have access to any projects');
      registerAndStorePage.findWhoIsMyAdminTrigger().should('exist');
    });
  });
});
