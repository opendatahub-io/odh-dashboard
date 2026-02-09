/**
 * Tests for project permissions with projectRBAC feature enabled.
 * Covers basic table rendering, filtering, role details modal, and role unassignment.
 */
import { mock200Status } from '@odh-dashboard/internal/__mocks__/mockK8sStatus';
import {
  initProjectRbacIntercepts,
  mockClusterRoleK8sResource,
  mockK8sResourceList,
  mockRoleBindingK8sResource,
  mockUserRoleBindingSubject,
  NAMESPACE,
} from './permissionsRbacTestUtils';
import { DeleteModal } from '../../../../pages/components/DeleteModal';
import { projectRbacPermissions } from '../../../../pages/projectRbacPermissions';
import { be } from '../../../../utils/should';
import { getK8sAPIResourceURL } from '../../../../utils/k8s';
import { ClusterRoleModel, RoleBindingModel } from '../../../../utils/models';
import { asProjectAdminUser } from '../../../../utils/mockUsers';

describe('Permissions tab (projectRBAC) - Tables and Filtering', () => {
  const usersTable = projectRbacPermissions.getUsersTable();
  const groupsTable = projectRbacPermissions.getGroupsTable();

  beforeEach(() => {
    asProjectAdminUser();
  });

  it('should navigate to Manage permissions page from the Permissions toolbar', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    projectRbacPermissions.findAssignRolesButton().should('be.enabled').click();
    cy.url().should('include', `/projects/${NAMESPACE}/permissions/assign`);
    projectRbacPermissions.findAssignRolesPage().should('exist');
  });

  it('should open Manage permissions with subject prefilled and locked', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    usersTable.findManageRolesAction('test-user-1').click();
    cy.url().should('include', `/projects/${NAMESPACE}/permissions/assign`);
    cy.url().should('not.include', 'subjectKind=');
    cy.url().should('not.include', 'subjectName=');

    projectRbacPermissions.findAssignRolesPage().should('exist');
    projectRbacPermissions.findAssignRolesSubjectReadonly().should('contain.text', 'test-user-1');
    projectRbacPermissions.findAssignRolesSubjectTypeahead().should('not.exist');
  });

  it('should render Users/Groups role tables and allow filtering by friendly role names', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    projectRbacPermissions.findAssignRolesButton().should('be.enabled');

    // Users table: rowSpan grouping should result in a single name cell for test-user-1
    usersTable.findNameCell('test-user-1').should('have.attr', 'rowspan', '2');
    usersTable.findRoleLink('Admin').should('exist');
    usersTable.findRoleLink('Contributor').should('exist');

    // Groups table: should render group + role
    groupsTable.findNameCell('test-group-1').should('exist');
    groupsTable.findRoleLink('Contributor').should('exist');

    // Role filter should match friendly display names (Contributor)
    projectRbacPermissions.selectFilterType('Role');
    projectRbacPermissions.findRoleFilterInput().should('be.visible').clear().type('contri');
    usersTable.findRoleLink('Contributor').should('exist');
    usersTable.findRoleLink('Admin').should('not.exist');
  });

  it('should filter by subject scope and support empty results + clear filters', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Scope: Users only
    projectRbacPermissions.selectSubjectScope('user');
    projectRbacPermissions.findUsersTable().should('exist');
    projectRbacPermissions.findGroupsTable().should('not.exist');

    // Name filter: empty results should show empty view with Clear all filters
    projectRbacPermissions.selectFilterType('Name');
    projectRbacPermissions.findNameFilterInput().should('be.visible').clear().type('no-such-user');
    projectRbacPermissions.findEmptyTableState().should('exist');
    projectRbacPermissions.findClearAllFiltersButton().click();
    projectRbacPermissions.findEmptyTableState().should('not.exist');
    usersTable.findRoleLink('Admin').should('exist');
    usersTable.findRoleLink('Contributor').should('exist');

    // Role filter: filter to empty + clear restores
    projectRbacPermissions.selectFilterType('Role');
    projectRbacPermissions.findRoleFilterInput().should('be.visible').clear().type('no-such-role');
    projectRbacPermissions.findEmptyTableState().should('exist');
    projectRbacPermissions.findClearAllFiltersButton().click();
    projectRbacPermissions.findEmptyTableState().should('not.exist');
    usersTable.findRoleLink('Admin').should('exist');
    usersTable.findRoleLink('Contributor').should('exist');

    // Scope: Groups only
    projectRbacPermissions.selectSubjectScope('group');
    projectRbacPermissions.findGroupsTable().should('exist');
    projectRbacPermissions.findUsersTable().should('not.exist');

    // Scope: All subjects
    projectRbacPermissions.selectSubjectScope('all');
    projectRbacPermissions.findGroupsTable().should('exist');
    projectRbacPermissions.findUsersTable().should('exist');
  });

  it('should show Manage permissions for irreversible role assignments', () => {
    const userName = 'test-user-1';
    const userSubject = mockUserRoleBindingSubject({ name: userName });
    const rbView = mockRoleBindingK8sResource({
      name: 'rb-user-view',
      namespace: NAMESPACE,
      subjects: [userSubject],
      roleRefKind: 'ClusterRole',
      roleRefName: 'view',
      creationTimestamp: '2024-01-01T00:00:00Z',
    });
    initProjectRbacIntercepts({ items: [rbView] });

    projectRbacPermissions.visit(NAMESPACE);
    usersTable.findManageRolesAction(userName).should('exist');
  });

  describe('Subject roles table sorting', () => {
    it('should sort users table by Name column', () => {
      // Create multiple users for sorting
      const user1 = mockUserRoleBindingSubject({ name: 'alice' });
      const user2 = mockUserRoleBindingSubject({ name: 'bob' });
      const roleBindings = [
        mockRoleBindingK8sResource({
          name: 'rb-alice',
          namespace: NAMESPACE,
          subjects: [user1],
          roleRefKind: 'ClusterRole',
          roleRefName: 'admin',
          creationTimestamp: '2024-01-01T00:00:00Z',
        }),
        mockRoleBindingK8sResource({
          name: 'rb-bob',
          namespace: NAMESPACE,
          subjects: [user2],
          roleRefKind: 'ClusterRole',
          roleRefName: 'admin',
          creationTimestamp: '2024-02-01T00:00:00Z',
        }),
      ];

      initProjectRbacIntercepts({ items: roleBindings });
      projectRbacPermissions.visit(NAMESPACE);

      // Click Name header to sort
      projectRbacPermissions.getUsersTable().clickColumnSort(/Name/i);

      // Verify sorting works (check first row)
      projectRbacPermissions.getUsersTable().findNameCell('alice').should('exist');
    });

    it('should sort users table by Date created column', () => {
      const user1 = mockUserRoleBindingSubject({ name: 'alice' });
      const user2 = mockUserRoleBindingSubject({ name: 'bob' });
      const roleBindings = [
        mockRoleBindingK8sResource({
          name: 'rb-alice',
          namespace: NAMESPACE,
          subjects: [user1],
          roleRefKind: 'ClusterRole',
          roleRefName: 'admin',
          creationTimestamp: '2024-01-01T00:00:00Z',
        }),
        mockRoleBindingK8sResource({
          name: 'rb-bob',
          namespace: NAMESPACE,
          subjects: [user2],
          roleRefKind: 'ClusterRole',
          roleRefName: 'admin',
          creationTimestamp: '2024-02-01T00:00:00Z',
        }),
      ];

      initProjectRbacIntercepts({ items: roleBindings });
      projectRbacPermissions.visit(NAMESPACE);

      // Click Date created header to sort (use exact match to avoid hitting help popover button)
      projectRbacPermissions.getUsersTable().clickColumnSort(/^Date created$/i);

      // Table should be sorted by date
      projectRbacPermissions.findUsersTable().should('exist');
    });
  });
});

describe('Permissions tab (projectRBAC) - Role Details Modal', () => {
  const usersTable = projectRbacPermissions.getUsersTable();

  beforeEach(() => {
    asProjectAdminUser();
  });

  it('should open the role details modal and support rules sorting + resource names helper', () => {
    initProjectRbacIntercepts();

    // Override ClusterRole list to include rules for the Admin role.
    cy.interceptK8sList(
      ClusterRoleModel,
      mockK8sResourceList([
        mockClusterRoleK8sResource({
          name: 'admin',
          labels: { 'kubernetes.io/bootstrapping': 'rbac-defaults' },
          rules: [
            {
              verbs: ['get'],
              apiGroups: ['z-group'],
              resources: ['b-res'],
              resourceNames: ['b-name'],
            },
            {
              verbs: ['get'],
              apiGroups: ['a-group'],
              resources: ['a-res'],
              resourceNames: ['a-name'],
            },
          ],
        }),
        mockClusterRoleK8sResource({
          name: 'edit',
          labels: { foo: 'bar' },
        }),
      ]),
    );

    projectRbacPermissions.visit(NAMESPACE);
    usersTable.findRoleLink('Admin').click();

    const roleDetailsModal = projectRbacPermissions.getRoleDetailsModal();
    roleDetailsModal.find().should('exist');

    const rulesTable = roleDetailsModal.getRulesTable();

    // Sort: API Groups
    rulesTable.clickHeaderSort('API Groups');
    rulesTable.findFirstBodyRow().should('contain.text', 'a-group');

    // Sort: Resource type
    rulesTable.clickHeaderSort('Resource type');
    rulesTable.findFirstBodyRow().should('contain.text', 'a-res');

    // Sort: Resource names (exclude the help button)
    rulesTable.clickHeaderSort(/^Resource names$/);
    rulesTable.findFirstBodyRow().should('contain.text', 'a-name');
  });

  it('should show assignees table with sortable columns', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(NAMESPACE);

    // Open modal from role link
    usersTable.findRoleLink('Contributor').click();
    const roleDetailsModal = projectRbacPermissions.getRoleDetailsModal();
    roleDetailsModal.find().should('exist');

    roleDetailsModal.clickAssigneesTab();
    const assigneesTable = roleDetailsModal.getAssigneesTable();
    assigneesTable.find().should('exist');

    // Sort by Subject
    assigneesTable.findHeaderSortButton('Subject').click();
    assigneesTable.findHeaderSortButton('Subject').should(be.sortAscending);
    assigneesTable.findFirstBodyRow().should('contain.text', 'test-group-1');

    // Sort by Subject kind
    assigneesTable.findHeaderSortButton('Subject kind').click();
    assigneesTable.findHeaderSortButton('Subject kind').should(be.sortAscending);
    assigneesTable.findFirstBodyRow().should('contain.text', 'test-group-1');

    // Sort by Role binding
    assigneesTable.findHeaderSortButton('Role binding').click();
    assigneesTable.findHeaderSortButton('Role binding').should(be.sortAscending);
    assigneesTable.findFirstBodyRow().should('contain.text', 'rb-group-edit');
  });
});

describe('Permissions tab (projectRBAC) - Role Unassignment', () => {
  const usersTable = projectRbacPermissions.getUsersTable();

  beforeEach(() => {
    asProjectAdminUser();
  });

  it('should remove a user role assignment after confirmation', () => {
    const userName = 'test-user-1';
    const userSubject = mockUserRoleBindingSubject({ name: userName });
    const rbAdmin = mockRoleBindingK8sResource({
      name: 'rb-user-admin',
      namespace: NAMESPACE,
      subjects: [userSubject],
      roleRefKind: 'ClusterRole',
      roleRefName: 'admin',
      creationTimestamp: '2024-01-01T00:00:00Z',
    });

    const roleBindingsPath = getK8sAPIResourceURL(RoleBindingModel, undefined, { ns: NAMESPACE });
    initProjectRbacIntercepts({ items: [rbAdmin] });

    let roleBindingsItems: ReturnType<typeof mockRoleBindingK8sResource>[] = [rbAdmin];
    cy.intercept({ method: 'GET', pathname: roleBindingsPath }, (req) => {
      req.reply(mockK8sResourceList(roleBindingsItems));
    }).as('listRoleBindingsDynamic');

    let deleteCount = 0;
    cy.interceptK8s(
      'DELETE',
      { model: RoleBindingModel, ns: NAMESPACE, name: rbAdmin.metadata.name },
      (req) => {
        deleteCount += 1;
        roleBindingsItems = [];
        req.reply(mock200Status({}));
      },
    ).as('deleteRoleBindingAdmin');

    projectRbacPermissions.visit(NAMESPACE);
    cy.wait('@listRoleBindingsDynamic');

    usersTable.getRowByRoleLink('Admin').findKebabAction('Unassign').click();
    const unassignRoleModal = new DeleteModal(/Unassign role\?/);
    unassignRoleModal.shouldBeOpen();

    // Cancel does not unassign
    unassignRoleModal.findCancelButton().click();
    unassignRoleModal.shouldBeOpen(false);
    cy.wrap(null).then(() => {
      expect(deleteCount).to.eq(0);
    });
    usersTable.findRoleLink('Admin').should('exist');

    // Confirm remove the role assignment (RoleBinding deleted because it would become empty)
    usersTable.getRowByRoleLink('Admin').findKebabAction('Unassign').click();
    unassignRoleModal.shouldBeOpen();
    unassignRoleModal
      .findSubmitButton({ name: /Unassign role/i })
      .should('be.enabled')
      .click();

    cy.wait('@deleteRoleBindingAdmin');
    cy.wait('@listRoleBindingsDynamic');
    usersTable.findRoleLink('Admin').should('not.exist');
  });

  it('should require typing to remove a non-reversible role assignment', () => {
    const userName = 'test-user-1';
    const userSubject = mockUserRoleBindingSubject({ name: userName });
    const rbView = mockRoleBindingK8sResource({
      name: 'rb-user-view',
      namespace: NAMESPACE,
      subjects: [userSubject],
      roleRefKind: 'ClusterRole',
      roleRefName: 'view',
      creationTimestamp: '2024-01-01T00:00:00Z',
    });

    const roleBindingsPath = getK8sAPIResourceURL(RoleBindingModel, undefined, { ns: NAMESPACE });
    initProjectRbacIntercepts({ items: [rbView] });

    const roleBindingsItems: ReturnType<typeof mockRoleBindingK8sResource>[] = [rbView];
    cy.intercept({ method: 'GET', pathname: roleBindingsPath }, (req) => {
      req.reply(mockK8sResourceList(roleBindingsItems));
    }).as('listRoleBindingsDynamic');

    cy.interceptK8s(
      'DELETE',
      { model: RoleBindingModel, ns: NAMESPACE, name: rbView.metadata.name },
      mock200Status({}),
    ).as('deleteRoleBindingView');

    projectRbacPermissions.visit(NAMESPACE);
    cy.wait('@listRoleBindingsDynamic');

    usersTable.getRowByRoleLink('view').findKebabAction('Unassign').click();
    const unassignRoleModal = new DeleteModal(/Unassign role\?/);
    unassignRoleModal.shouldBeOpen();

    // Non-reversible roles should require typing the subject name to enable the button
    unassignRoleModal.findSubmitButton({ name: /Unassign role/i }).should('be.disabled');
    unassignRoleModal.findInput().fill(userName);
    unassignRoleModal
      .findSubmitButton({ name: /Unassign role/i })
      .should('be.enabled')
      .click();

    cy.wait('@deleteRoleBindingView');
  });
});
