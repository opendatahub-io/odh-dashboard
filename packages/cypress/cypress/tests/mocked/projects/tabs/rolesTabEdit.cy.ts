/**
 * Tests for the Edit Role flow: loading existing role, pre-populating form,
 * submitting via PUT, and error handling.
 */
import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockRoleK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import { mock404Error, mock409Error } from '@odh-dashboard/internal/__mocks__/mockK8sStatus';
import {
  ClusterRoleModel,
  ProjectModel,
  RoleBindingModel,
  RoleModel,
} from '../../../../utils/models';
import { asProjectAdminUser } from '../../../../utils/mockUsers';
import { projectRoles } from '../../../../pages/projectRoles';

const NAMESPACE = 'test-project';
const ROLE_NAME = 'my-custom-role';

const existingRole = (() => {
  const role = mockRoleK8sResource({
    name: ROLE_NAME,
    namespace: NAMESPACE,
    labels: { 'opendatahub.io/dashboard': 'true' },
    rules: [
      {
        verbs: ['get', 'list'],
        apiGroups: [''],
        resources: ['pods'],
      },
    ],
  });
  role.metadata.resourceVersion = '12345';
  return role;
})();

const initIntercepts = () => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ roleManagement: true }));
  cy.interceptK8s(ProjectModel, mockProjectK8sResource({ k8sName: NAMESPACE }));
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: NAMESPACE })]),
  );
  cy.interceptK8sList({ model: RoleModel, ns: NAMESPACE }, mockK8sResourceList([existingRole]));
  cy.interceptK8sList(ClusterRoleModel, mockK8sResourceList([]));
  cy.interceptK8sList({ model: RoleBindingModel, ns: NAMESPACE }, mockK8sResourceList([]));
  cy.interceptK8s('GET', { model: RoleModel, ns: NAMESPACE, name: ROLE_NAME }, existingRole);
};

describe('Edit Role', () => {
  beforeEach(() => {
    asProjectAdminUser();
    initIntercepts();
  });

  it('should load the edit page and show existing role name', () => {
    projectRoles.visitEditRole(NAMESPACE, ROLE_NAME);
    projectRoles.findRoleNameInput().should('have.value', ROLE_NAME);
  });

  it('should show k8s resource name as immutable (plain text, not editable)', () => {
    projectRoles.visitEditRole(NAMESPACE, ROLE_NAME);
    cy.findByTestId('role-resourceName').should('not.exist');
    cy.contains(ROLE_NAME).should('exist');
  });

  it('should show "Edit custom role" as page title', () => {
    projectRoles.visitEditRole(NAMESPACE, ROLE_NAME);
    cy.findByTestId('app-page-title').should('contain.text', 'Edit custom role');
  });

  it('should show "Save changes" as submit button text', () => {
    projectRoles.visitEditRole(NAMESPACE, ROLE_NAME);
    projectRoles.findSubmitButton().should('have.text', 'Save changes');
  });

  it('should submit via PUT when saving changes', () => {
    cy.interceptK8s('PUT', { model: RoleModel, ns: NAMESPACE, name: ROLE_NAME }, existingRole).as(
      'updateRole',
    );

    projectRoles.visitEditRole(NAMESPACE, ROLE_NAME);
    projectRoles.findSubmitButton().click();

    cy.wait('@updateRole').then((interception) => {
      expect(interception.request.body.metadata.name).to.equal(ROLE_NAME);
      expect(interception.request.body.metadata.namespace).to.equal(NAMESPACE);
      expect(interception.request.body.metadata.resourceVersion).to.equal('12345');
      expect(interception.request.body.metadata.labels).to.have.property(
        'opendatahub.io/dashboard',
        'true',
      );
    });

    cy.url().should('include', `/projects/${NAMESPACE}`);
    cy.url().should('include', 'section=roles');
  });

  it('should show error alert when update API returns an error', () => {
    cy.interceptK8s(
      'PUT',
      { model: RoleModel, ns: NAMESPACE, name: ROLE_NAME },
      {
        statusCode: 409,
        body: mock409Error({ message: 'Conflict - role was modified' }),
      },
    ).as('updateRole');

    projectRoles.visitEditRole(NAMESPACE, ROLE_NAME);
    projectRoles.findSubmitButton().click();

    cy.wait('@updateRole');
    projectRoles.findSubmitErrorAlert().should('exist');
    projectRoles.findSubmitButton().should('be.enabled');
  });

  it('should submit modified display name in PUT payload', () => {
    cy.interceptK8s('PUT', { model: RoleModel, ns: NAMESPACE, name: ROLE_NAME }, existingRole).as(
      'updateRole',
    );

    projectRoles.visitEditRole(NAMESPACE, ROLE_NAME);
    projectRoles.findRoleNameInput().clear().type('Updated Role Name');
    projectRoles.findSubmitButton().click();

    cy.wait('@updateRole').then((interception) => {
      expect(interception.request.body.metadata.annotations).to.have.property(
        'openshift.io/display-name',
        'Updated Role Name',
      );
    });
  });

  it('should show error page when role does not exist (404)', () => {
    cy.interceptK8s(
      'GET',
      { model: RoleModel, ns: NAMESPACE, name: 'non-existent-role' },
      { statusCode: 404, body: mock404Error({}) },
    );

    cy.visitWithLogin(`/projects/${NAMESPACE}/roles/non-existent-role/edit`);
    cy.contains('Unable to load role').should('exist');
  });

  it('should navigate to edit page from table kebab action', () => {
    projectRoles.visit(NAMESPACE);

    const row = projectRoles.getRow(ROLE_NAME);
    row.findKebabAction('Edit role').click();

    cy.url().should('include', `/roles/${ROLE_NAME}/edit`);
  });
});
