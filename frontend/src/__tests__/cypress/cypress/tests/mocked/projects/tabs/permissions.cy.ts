import { mockK8sResourceList, mockProjectK8sResource } from '#~/__mocks__';
import { mock200Status } from '#~/__mocks__/mockK8sStatus';
import { mockRoleBindingK8sResource } from '#~/__mocks__/mockRoleBindingK8sResource';
import {
  permissions,
  roleBindingPermissionsChangeModal,
} from '#~/__tests__/cypress/cypress/pages/permissions';
import { be } from '#~/__tests__/cypress/cypress/utils/should';
import { ProjectModel, RoleBindingModel } from '#~/__tests__/cypress/cypress/utils/models';
import type { RoleBindingSubject } from '#~/k8sTypes';
import { asProjectEditUser } from '#~/__tests__/cypress/cypress/utils/mockUsers';

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
};

const initIntercepts = ({ isEmpty = false }: HandlersProps) => {
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: 'test-project' })]),
  );
  cy.interceptK8sList(
    { model: RoleBindingModel, ns: 'test-project' },
    mockK8sResourceList(
      isEmpty
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
          ],
    ),
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
      initIntercepts({ isEmpty: false });
      permissions.visit('test-project');

      userTable.getTableRow('user-1').findKebabAction('Edit').click();
      userTable.findEditInput('user-1').clear().type('user-3');
      userTable.selectPermission('user-3', 'Admin Edit the project and manage user access');
      userTable.findEditSaveButton('user-3').click();

      roleBindingPermissionsChangeModal.findPermissionsChangeModal().should('not.exist');
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
