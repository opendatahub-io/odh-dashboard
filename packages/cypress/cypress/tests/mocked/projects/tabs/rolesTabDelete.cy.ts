/**
 * Tests for the Roles tab delete action: kebab action states,
 * confirmation dialog, and successful deletion flow.
 */
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import {
  mockClusterRoleK8sResource,
  mockRoleBindingK8sResource,
  mockRoleK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import {
  ClusterRoleModel,
  ProjectModel,
  RoleBindingModel,
  RoleModel,
} from '../../../../utils/models';
import { asProjectAdminUser } from '../../../../utils/mockUsers';
import { projectRoles } from '../../../../pages/projectRoles';

const NAMESPACE = 'test-project';
const ROLE_NAME = 'dashboard-custom';

const dashboardRole = mockRoleK8sResource({
  name: ROLE_NAME,
  namespace: NAMESPACE,
  labels: { 'opendatahub.io/dashboard': 'true' },
});

const initIntercepts = ({
  roleBindings = [],
}: {
  roleBindings?: ReturnType<typeof mockRoleBindingK8sResource>[];
} = {}) => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ roleManagement: true }));
  cy.interceptK8s(ProjectModel, mockProjectK8sResource({ k8sName: NAMESPACE }));
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: NAMESPACE })]),
  );
  cy.interceptK8sList({ model: RoleModel, ns: NAMESPACE }, mockK8sResourceList([dashboardRole]));
  cy.interceptK8sList(
    ClusterRoleModel,
    mockK8sResourceList([
      mockClusterRoleK8sResource({
        name: 'admin',
        labels: { 'kubernetes.io/bootstrapping': 'rbac-defaults' },
      }),
    ]),
  );
  cy.interceptK8sList(
    { model: RoleBindingModel, ns: NAMESPACE },
    mockK8sResourceList(roleBindings),
  );
};

describe('Roles tab delete action', () => {
  beforeEach(() => {
    asProjectAdminUser();
  });

  it('should disable the Delete action for ClusterRole entries', () => {
    initIntercepts();
    projectRoles.visit(NAMESPACE);

    const adminRow = projectRoles.getRow('Admin');
    adminRow.findKebabAction('Delete role', false).should('have.attr', 'aria-disabled', 'true');
  });

  it('should enable the Delete action for namespace-scoped Role entries', () => {
    initIntercepts();
    projectRoles.visit(NAMESPACE);

    const customRow = projectRoles.getRow(ROLE_NAME);
    customRow.findKebabAction('Delete role').should('not.have.attr', 'aria-disabled');
  });

  it('should open the delete confirmation dialog', () => {
    initIntercepts();
    projectRoles.visit(NAMESPACE);

    const customRow = projectRoles.getRow(ROLE_NAME);
    customRow.findKebabAction('Delete role').click();

    cy.findByTestId('delete-role-modal').should('exist');
    cy.findByTestId('delete-role-modal').contains('Delete role?');
  });

  it('should show deletion text without unassignment when no bindings exist', () => {
    initIntercepts();
    projectRoles.visit(NAMESPACE);

    projectRoles.getRow(ROLE_NAME).findKebabAction('Delete role').click();

    cy.findByTestId('delete-role-modal').contains('will be deleted.');
    cy.findByTestId('delete-role-modal').contains('unassigned from').should('not.exist');
  });

  it('should show unassignment text when role has bindings', () => {
    initIntercepts({
      roleBindings: [
        mockRoleBindingK8sResource({
          name: 'binding-1',
          namespace: NAMESPACE,
          roleRefName: ROLE_NAME,
          roleRefKind: 'Role',
          subjects: [
            { kind: 'User', name: 'user-a', apiGroup: 'rbac.authorization.k8s.io' },
            { kind: 'Group', name: 'group-b', apiGroup: 'rbac.authorization.k8s.io' },
          ],
        }),
      ],
    });
    projectRoles.visit(NAMESPACE);

    projectRoles.getRow(ROLE_NAME).findKebabAction('Delete role').click();

    cy.findByTestId('delete-role-modal').contains(
      'will be deleted and unassigned from 2 users or groups',
    );
  });

  it('should require typing the role name to confirm deletion', () => {
    initIntercepts();
    projectRoles.visit(NAMESPACE);

    projectRoles.getRow(ROLE_NAME).findKebabAction('Delete role').click();

    cy.findByTestId('delete-role-modal')
      .findByRole('button', { name: 'Delete role' })
      .should('be.disabled');

    cy.findByTestId('delete-modal-input').type(ROLE_NAME);

    cy.findByTestId('delete-role-modal')
      .findByRole('button', { name: 'Delete role' })
      .should('be.enabled');
  });

  it('should delete the role and refresh the table on confirmation', () => {
    initIntercepts();
    projectRoles.visit(NAMESPACE);

    cy.interceptK8s(
      'DELETE',
      { model: RoleModel, name: ROLE_NAME, ns: NAMESPACE },
      { kind: 'Status', apiVersion: 'v1', status: 'Success', code: 200, message: '', reason: '' },
    ).as('deleteRole');

    projectRoles.getRow(ROLE_NAME).findKebabAction('Delete role').click();
    cy.findByTestId('delete-modal-input').type(ROLE_NAME);
    cy.findByTestId('delete-role-modal').findByRole('button', { name: 'Delete role' }).click();

    cy.wait('@deleteRole').then((interception) => {
      expect(interception.request.method).to.equal('DELETE');
    });
    cy.findByTestId('delete-role-modal').should('not.exist');
  });

  it('should close the modal when cancel is clicked', () => {
    initIntercepts();
    projectRoles.visit(NAMESPACE);

    projectRoles.getRow(ROLE_NAME).findKebabAction('Delete role').click();
    cy.findByTestId('delete-role-modal').should('exist');

    cy.findByTestId('delete-role-modal').findByRole('button', { name: 'Cancel' }).click();
    cy.findByTestId('delete-role-modal').should('not.exist');
  });
});
