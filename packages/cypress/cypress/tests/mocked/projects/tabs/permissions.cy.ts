/**
 * Tests for the legacy Permissions tab (non-projectRBAC).
 * These tests cover the original permissions functionality before the projectRBAC feature.
 */
import {
  mockK8sResourceList,
  mockProjectK8sResource,
  mockRoleBindingK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import { mock200Status } from '@odh-dashboard/internal/__mocks__/mockK8sStatus';
import type { RoleBindingSubject } from '@odh-dashboard/internal/k8sTypes';
import { permissions, roleBindingPermissionsChangeModal } from '../../../../pages/permissions';
import { be } from '../../../../utils/should';
import { ProjectModel, RoleBindingModel } from '../../../../utils/models';
import { asProjectEditUser } from '../../../../utils/mockUsers';

const userSubjects: RoleBindingSubject[] = [
  {
    kind: 'User',
    apiGroup: 'rbac.authorization.k8s.io',
    name: 'user-1',
  },
  {
    kind: 'User',
    apiGroup: 'rbac.authorization.k8s.io',
    name: 'test-user',
  },
];

const groupSubjects: RoleBindingSubject[] = [
  {
    kind: 'Group',
    apiGroup: 'rbac.authorization.k8s.io',
    name: 'group-1',
  },
];

type HandlersProps = {
  isEmpty?: boolean;
  includeRoleBindingWithoutSubjects?: boolean;
};

/**
 * Creates a RoleBinding without subjects, which is valid per Kubernetes API spec.
 * This simulates RoleBindings found in system namespaces like istio-system.
 */
const createRoleBindingWithoutSubjects = () => ({
  kind: 'RoleBinding',
  apiVersion: 'rbac.authorization.k8s.io/v1',
  metadata: {
    name: 'system-rolebinding-no-subjects',
    namespace: 'test-project',
    uid: 'test-uid-no-subjects',
    creationTimestamp: '2023-02-14T21:43:59Z',
  },
  // subjects is intentionally omitted - valid per K8s API spec
  roleRef: {
    apiGroup: 'rbac.authorization.k8s.io',
    kind: 'ClusterRole',
    name: 'view',
  },
});

const initIntercepts = ({
  isEmpty = false,
  includeRoleBindingWithoutSubjects = false,
}: HandlersProps) => {
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: 'test-project' })]),
  );

  const roleBindings = isEmpty
    ? []
    : [
        mockRoleBindingK8sResource({
          name: 'user-1',
          subjects: [userSubjects[0]],
          roleRefName: 'edit',
        }),
        mockRoleBindingK8sResource({
          name: 'test-user',
          subjects: [userSubjects[1]],
          roleRefName: 'edit',
        }),
        mockRoleBindingK8sResource({
          name: 'group-1',
          subjects: groupSubjects,
          roleRefName: 'edit',
        }),
      ];

  if (includeRoleBindingWithoutSubjects) {
    roleBindings.push(
      createRoleBindingWithoutSubjects() as ReturnType<typeof mockRoleBindingK8sResource>,
    );
  }

  cy.interceptK8sList(
    { model: RoleBindingModel, ns: 'test-project' },
    mockK8sResourceList(roleBindings),
  );
};

describe('Permissions tab', () => {
  const userTable = permissions.getUserTable();
  const groupTable = permissions.getGroupTable();

  it('should not be accessible for non-project admins', () => {
    asProjectEditUser();
    initIntercepts({ isEmpty: false });
    permissions.visit('test-project');
    cy.url().should('include', '/projects/test-project?section=overview');
  });

  it('should not allow deep-link access to Manage permissions page for non-project admins', () => {
    asProjectEditUser();
    initIntercepts({ isEmpty: false });
    permissions.visitAssignRoles('test-project');
    cy.url().should('include', '/projects/test-project?section=overview');
  });

  it('Empty table for groups and users', () => {
    initIntercepts({ isEmpty: true });
    permissions.visit('test-project');
    cy.url().should('include', '/projects/test-project?section=permissions');

    //User table
    userTable.findRows().should('have.length', 0);
    permissions.findAddUserButton().should('be.enabled');

    //Group table
    groupTable.findRows().should('have.length', 0);
    permissions.findAddGroupButton().should('be.enabled');
  });

  it('should render correctly when RoleBindings without subjects exist', () => {
    // This test verifies the fix for the TypeError that occurred when viewing
    // the Permissions tab for namespaces like istio-system where RoleBinding
    // objects may exist without a subjects array (valid per K8s API spec).
    initIntercepts({ isEmpty: false, includeRoleBindingWithoutSubjects: true });
    permissions.visit('test-project');
    cy.url().should('include', '/projects/test-project?section=permissions');

    // The page should render without errors
    // Only the RoleBindings with valid subjects should be displayed
    userTable.findRows().should('have.length', 2);
    groupTable.findRows().should('have.length', 1);

    // Verify the valid users are displayed correctly
    userTable.getTableRow('user-1').find().should('exist');
    userTable.getTableRow('test-user').find().should('exist');

    // Verify the valid group is displayed correctly
    groupTable.getTableRow('group-1').find().should('exist');

    // The add buttons should still be enabled
    permissions.findAddUserButton().should('be.enabled');
    permissions.findAddGroupButton().should('be.enabled');
  });

  describe('Users table', () => {
    it('Table sorting for users table', () => {
      initIntercepts({ isEmpty: false });
      permissions.visit('test-project');

      // by name
      userTable.findTableHeaderButton('Name').click();
      userTable.findTableHeaderButton('Name').should(be.sortDescending);
      userTable.findTableHeaderButton('Name').click();
      userTable.findTableHeaderButton('Name').should(be.sortAscending);

      //by permissions
      userTable.findTableHeaderButton('Permission').click();
      userTable.findTableHeaderButton('Permission').should(be.sortAscending);
      userTable.findTableHeaderButton('Permission').click();
      userTable.findTableHeaderButton('Permission').should(be.sortDescending);

      //by date added
      userTable.findTableHeaderButton('Date added').click();
      userTable.findTableHeaderButton('Date added').should(be.sortAscending);
      userTable.findTableHeaderButton('Date added').click();
      userTable.findTableHeaderButton('Date added').should(be.sortDescending);
    });

    it('Add user', () => {
      initIntercepts({ isEmpty: true });
      cy.interceptK8s('POST', RoleBindingModel, mockRoleBindingK8sResource({})).as('addUser');
      permissions.visit('test-project');

      permissions.findAddUserButton().click();

      userTable.findAddInput().fill('user-1');
      userTable.selectPermission('user-1', 'Admin Edit the project and manage user access');
      userTable.findSaveNewButton().click();

      cy.wait('@addUser').then((interception) => {
        expect(interception.request.body).to.containSubset({
          metadata: {
            labels: {
              'opendatahub.io/dashboard': 'true',
              'opendatahub.io/project-sharing': 'true',
            },
          },
          roleRef: { apiGroup: 'rbac.authorization.k8s.io', kind: 'ClusterRole', name: 'admin' },
          subjects: [{ apiGroup: 'rbac.authorization.k8s.io', kind: 'User', name: 'user-1' }],
        });
      });
    });

    it('Edit user', () => {
      initIntercepts({ isEmpty: false });
      cy.interceptK8s('POST', RoleBindingModel, mockRoleBindingK8sResource({})).as('editUser');
      cy.interceptK8s(
        'DELETE',
        { model: RoleBindingModel, ns: 'test-project', name: 'user-1' },
        mock200Status({}),
      ).as('deleteUser');

      permissions.visit('test-project');

      userTable.getTableRow('user-1').findKebabAction('Edit').click();
      userTable.findEditInput('user-1').clear().type('user-3');
      userTable.selectPermission('user-3', 'Admin Edit the project and manage user access');
      userTable.findEditSaveButton('user-3').click();

      cy.wait('@editUser').then((interception) => {
        expect(interception.request.body).to.containSubset({
          metadata: {
            labels: {
              'opendatahub.io/dashboard': 'true',
              'opendatahub.io/project-sharing': 'true',
            },
          },
          roleRef: { apiGroup: 'rbac.authorization.k8s.io', kind: 'ClusterRole', name: 'admin' },
          subjects: [{ apiGroup: 'rbac.authorization.k8s.io', kind: 'User', name: 'user-3' }],
        });
      });
      cy.wait('@deleteUser');
    });

    it('Delete user', () => {
      initIntercepts({ isEmpty: false });

      cy.interceptK8s(
        'DELETE',
        { model: RoleBindingModel, ns: 'test-project', name: 'user-1' },
        mock200Status({}),
      ).as('deleteUser');
      permissions.visit('test-project');

      userTable.getTableRow('user-1').findKebabAction('Delete').click();

      cy.wait('@deleteUser');
    });

    it('Shows confirmation modal when editing own permissions', () => {
      initIntercepts({ isEmpty: false });
      permissions.visit('test-project');

      userTable.getTableRow('test-user').findKebabAction('Edit').click();
      userTable.findEditInput('test-user').clear().type('test-user');
      userTable.selectPermission('test-user', 'Admin Edit the project and manage user access');
      userTable.findEditSaveButton('test-user').click();

      roleBindingPermissionsChangeModal.findPermissionsChangeModal().should('exist');
      roleBindingPermissionsChangeModal.findModalInput().should('exist').type('test-user');
      roleBindingPermissionsChangeModal.findModalConfirmButton('Save').should('not.be.disabled');
      roleBindingPermissionsChangeModal.findModalCancelButton().click();
    });

    it('Shows confirmation modal when deleting own permissions', () => {
      cy.interceptK8s(
        'DELETE',
        { model: RoleBindingModel, ns: 'test-project', name: 'test-user' },
        mock200Status({}),
      ).as('deleteUser');
      initIntercepts({ isEmpty: false });
      permissions.visit('test-project');

      userTable.getTableRow('test-user').findKebabAction('Delete').click();

      roleBindingPermissionsChangeModal.findPermissionsChangeModal().should('exist');
      roleBindingPermissionsChangeModal.findModalInput().should('exist').type('test-user');
      roleBindingPermissionsChangeModal.findModalConfirmButton('Delete').should('not.be.disabled');
      roleBindingPermissionsChangeModal.findModalCancelButton().click();
    });

    it('Does not show confirmation modal when editing other users permissions', () => {
      cy.interceptK8s('POST', RoleBindingModel, mockRoleBindingK8sResource({})).as('editUser');
      cy.interceptK8s(
        'DELETE',
        { model: RoleBindingModel, ns: 'test-project', name: 'user-1' },
        mock200Status({}),
      ).as('deleteUser');
      initIntercepts({ isEmpty: false });
      permissions.visit('test-project');

      userTable.getTableRow('user-1').findKebabAction('Edit').click();
      userTable.findEditInput('user-1').clear().type('user-3');
      userTable.selectPermission('user-3', 'Admin Edit the project and manage user access');
      userTable.findEditSaveButton('user-3').click();

      roleBindingPermissionsChangeModal.findPermissionsChangeModal().should('not.exist');
      cy.wait('@editUser');
      cy.wait('@deleteUser');
    });

    it('Does not show confirmation modal when deleting other users permissions', () => {
      cy.interceptK8s(
        'DELETE',
        { model: RoleBindingModel, ns: 'test-project', name: 'user-1' },
        mock200Status({}),
      ).as('deleteUser');
      initIntercepts({ isEmpty: false });
      permissions.visit('test-project');

      userTable.getTableRow('user-1').findKebabAction('Delete').click();
      roleBindingPermissionsChangeModal.findPermissionsChangeModal().should('not.exist');
      cy.wait('@deleteUser');
    });
  });

  describe('Groups table', () => {
    it('Table sorting for groups table', () => {
      initIntercepts({ isEmpty: false });

      permissions.visit('test-project');

      groupTable.findTableHeaderButton('Name').click();
      groupTable.findTableHeaderButton('Name').should(be.sortDescending);
      groupTable.findTableHeaderButton('Name').click();
      groupTable.findTableHeaderButton('Name').should(be.sortAscending);

      groupTable.findTableHeaderButton('Permission').click();
      groupTable.findTableHeaderButton('Permission').should(be.sortAscending);
      groupTable.findTableHeaderButton('Permission').click();
      groupTable.findTableHeaderButton('Permission').should(be.sortDescending);

      groupTable.findTableHeaderButton('Date added').click();
      groupTable.findTableHeaderButton('Date added').should(be.sortAscending);
      groupTable.findTableHeaderButton('Date added').click();
      groupTable.findTableHeaderButton('Date added').should(be.sortDescending);
    });

    it('Add group', () => {
      initIntercepts({ isEmpty: true });
      cy.interceptK8s('POST', RoleBindingModel, mockRoleBindingK8sResource({})).as('addGroup');
      permissions.visit('test-project');

      permissions.findAddGroupButton().click();
      groupTable.findAddInput().fill('group-1');
      groupTable.selectPermission('group-1', 'Admin Edit the project and manage user access');
      groupTable.findSaveNewButton().click();

      cy.wait('@addGroup').then((inerception) => {
        expect(inerception.request.body).to.containSubset({
          metadata: {
            labels: {
              'opendatahub.io/dashboard': 'true',
              'opendatahub.io/project-sharing': 'true',
            },
          },
          roleRef: { apiGroup: 'rbac.authorization.k8s.io', kind: 'ClusterRole', name: 'admin' },
          subjects: [{ apiGroup: 'rbac.authorization.k8s.io', kind: 'Group', name: 'group-1' }],
        });
      });
    });

    it('Edit group', () => {
      initIntercepts({ isEmpty: false });

      cy.interceptK8s('POST', RoleBindingModel, mockRoleBindingK8sResource({})).as('editGroup');
      cy.interceptK8s(
        'DELETE',
        { model: RoleBindingModel, ns: 'test-project', name: 'group-1' },
        mock200Status({}),
      ).as('deleteGroup');

      permissions.visit('test-project');

      groupTable.getTableRow('group-1').findKebabAction('Edit').click();
      groupTable.findEditInput('group-1').clear().type('group-3');
      groupTable.selectPermission('group-3', 'Admin Edit the project and manage user access');
      groupTable.findEditSaveButton('group-3').click();

      cy.wait('@editGroup').then((interception) => {
        expect(interception.request.body).to.containSubset({
          metadata: {
            labels: {
              'opendatahub.io/dashboard': 'true',
              'opendatahub.io/project-sharing': 'true',
            },
          },
          roleRef: { apiGroup: 'rbac.authorization.k8s.io', kind: 'ClusterRole', name: 'admin' },
          subjects: [{ apiGroup: 'rbac.authorization.k8s.io', kind: 'Group', name: 'group-3' }],
        });
      });
      cy.wait('@deleteGroup');
    });

    it('Delete group', () => {
      initIntercepts({ isEmpty: false });

      cy.interceptK8s(
        'DELETE',
        { model: RoleBindingModel, ns: 'test-project', name: 'group-1' },
        mock200Status({}),
      ).as('deleteGroup');

      permissions.visit('test-project');
      groupTable.getTableRow('group-1').findKebabAction('Delete').click();

      cy.wait('@deleteGroup');
    });
  });
});
