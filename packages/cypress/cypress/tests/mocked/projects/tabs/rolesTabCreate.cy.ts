/**
 * Tests for the Create Role submit flow: successful creation, empty-rules confirmation modal,
 * API error handling, and request payload validation.
 */
import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockRoleK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import { mock409Error } from '@odh-dashboard/internal/__mocks__/mockK8sStatus';
import {
  ClusterRoleModel,
  ProjectModel,
  RoleBindingModel,
  RoleModel,
} from '../../../../utils/models';
import { asProjectAdminUser } from '../../../../utils/mockUsers';
import { projectRoles } from '../../../../pages/projectRoles';

const NAMESPACE = 'test-project';

const addRule = (apiGroup: string, resource: string, verb: string) => {
  projectRoles.findAddRuleButton().click();
  projectRoles.findAddRuleModal().should('exist');
  projectRoles.findRuleApiGroupsToggle().click();
  projectRoles.findRuleApiGroupsToggle().parent().find('input').type(apiGroup);
  cy.contains(`Use custom API group "${apiGroup}"`).click();
  projectRoles.findRuleResourceTypesToggle().click();
  projectRoles.findRuleResourceTypesToggle().parent().find('input').type(resource);
  cy.contains(`Use custom resource type "${resource}"`).click();
  projectRoles.findVerbCheckbox(verb).click();
  projectRoles.findRuleSaveButton().click();
};

const initIntercepts = () => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ roleManagement: true }));
  cy.interceptK8s(ProjectModel, mockProjectK8sResource({ k8sName: NAMESPACE }));
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: NAMESPACE })]),
  );
  cy.interceptK8sList({ model: RoleModel, ns: NAMESPACE }, mockK8sResourceList([]));
  cy.interceptK8sList(ClusterRoleModel, mockK8sResourceList([]));
  cy.interceptK8sList({ model: RoleBindingModel, ns: NAMESPACE }, mockK8sResourceList([]));
};

describe('Create Role submit', () => {
  beforeEach(() => {
    asProjectAdminUser();
    initIntercepts();
  });

  it('should show confirmation modal when submitting with no rules', () => {
    projectRoles.visitCreateRole(NAMESPACE);
    projectRoles.findRoleNameInput().type('empty-role');
    projectRoles.findSubmitButton().click();

    projectRoles.findConfirmModal().should('exist');
    projectRoles.findConfirmModal().contains('Create empty role?').should('exist');
  });

  it('should close confirmation modal on cancel', () => {
    projectRoles.visitCreateRole(NAMESPACE);
    projectRoles.findRoleNameInput().type('empty-role');
    projectRoles.findSubmitButton().click();

    projectRoles.findConfirmModal().should('exist');
    projectRoles.findConfirmCancelButton().click();
    projectRoles.findConfirmModal().should('not.exist');
  });

  it('should create role without rules when confirmed', () => {
    cy.interceptK8s(
      'POST',
      { model: RoleModel, ns: NAMESPACE },
      mockRoleK8sResource({ name: 'empty-role', namespace: NAMESPACE }),
    ).as('createRole');

    projectRoles.visitCreateRole(NAMESPACE);
    projectRoles.findRoleNameInput().type('empty-role');
    projectRoles.findSubmitButton().click();

    projectRoles.findConfirmModal().should('exist');
    projectRoles.findConfirmCreateButton().click();

    cy.wait('@createRole').then((interception) => {
      expect(interception.request.body.metadata.name).to.equal('empty-role');
      expect(interception.request.body.metadata.namespace).to.equal(NAMESPACE);
      expect(interception.request.body.metadata.labels).to.have.property(
        'opendatahub.io/dashboard',
        'true',
      );
      expect(interception.request.body.rules).to.deep.equal([]);
    });

    cy.url().should('include', `/projects/${NAMESPACE}`);
    cy.url().should('include', 'section=roles');
  });

  it('should submit directly when rules are present', () => {
    cy.interceptK8s(
      'POST',
      { model: RoleModel, ns: NAMESPACE },
      mockRoleK8sResource({ name: 'my-role', namespace: NAMESPACE }),
    ).as('createRole');

    projectRoles.visitCreateRole(NAMESPACE);
    projectRoles.findRoleNameInput().type('my-role');

    addRule('apps', 'deployments', 'get');

    projectRoles.findSubmitButton().click();

    projectRoles.findConfirmModal().should('not.exist');

    cy.wait('@createRole').then((interception) => {
      expect(interception.request.body.metadata.name).to.equal('my-role');
      expect(interception.request.body.rules).to.have.length(1);
      expect(interception.request.body.rules[0].verbs).to.include('get');
    });

    cy.url().should('include', `/projects/${NAMESPACE}`);
    cy.url().should('include', 'section=roles');
  });

  it('should show error alert when API returns an error on direct submit', () => {
    cy.interceptK8s(
      'POST',
      { model: RoleModel, ns: NAMESPACE },
      {
        statusCode: 409,
        body: mock409Error({ message: 'Role already exists' }),
      },
    ).as('createRole');

    projectRoles.visitCreateRole(NAMESPACE);
    projectRoles.findRoleNameInput().type('my-role');

    addRule('apps', 'deployments', 'get');

    projectRoles.findSubmitButton().click();

    cy.wait('@createRole');
    projectRoles.findSubmitErrorAlert().should('exist');
    projectRoles.findSubmitButton().should('be.enabled');
  });

  it('should show error in confirmation modal when API fails', () => {
    cy.interceptK8s(
      'POST',
      { model: RoleModel, ns: NAMESPACE },
      {
        statusCode: 409,
        body: mock409Error({ message: 'Role already exists' }),
      },
    ).as('createRole');

    projectRoles.visitCreateRole(NAMESPACE);
    projectRoles.findRoleNameInput().type('empty-role');
    projectRoles.findSubmitButton().click();

    projectRoles.findConfirmModal().should('exist');
    projectRoles.findConfirmCreateButton().click();

    cy.wait('@createRole');
    projectRoles.findConfirmModal().should('exist');
    projectRoles.findConfirmModalErrorAlert().should('exist');
    projectRoles.findConfirmCreateButton().should('be.enabled');
  });

  it('should include display name and description annotations in payload', () => {
    cy.interceptK8s(
      'POST',
      { model: RoleModel, ns: NAMESPACE },
      mockRoleK8sResource({ name: 'annotated-role', namespace: NAMESPACE }),
    ).as('createRole');

    projectRoles.visitCreateRole(NAMESPACE);
    projectRoles.findRoleNameInput().type('annotated-role');
    projectRoles.findDescriptionTextarea().type('A test description');
    projectRoles.findSubmitButton().click();

    projectRoles.findConfirmCreateButton().click();

    cy.wait('@createRole').then((interception) => {
      expect(interception.request.body.metadata.annotations).to.have.property(
        'openshift.io/description',
        'A test description',
      );
      expect(interception.request.body.metadata.annotations).to.have.property(
        'openshift.io/display-name',
        'annotated-role',
      );
    });
  });
});
