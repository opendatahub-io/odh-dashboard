import {
  mockClusterRoleK8sResource,
  mockDashboardConfig,
  mockGroupRoleBindingSubject,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockRoleK8sResource,
  mockUserRoleBindingSubject,
} from '@odh-dashboard/internal/__mocks__';
import { mock200Status } from '@odh-dashboard/internal/__mocks__/mockK8sStatus';
import { mockRoleBindingK8sResource } from '@odh-dashboard/internal/__mocks__/mockRoleBindingK8sResource';
import type { RoleBindingSubject } from '@odh-dashboard/internal/k8sTypes';
import { DeleteModal } from '../../../../pages/components/DeleteModal';
import { permissions, roleBindingPermissionsChangeModal } from '../../../../pages/permissions';
import { projectRbacPermissions } from '../../../../pages/projectRbacPermissions';
import { be } from '../../../../utils/should';
import { getK8sAPIResourceURL } from '../../../../utils/k8s';
import {
  ClusterRoleModel,
  ProjectModel,
  RoleBindingModel,
  RoleModel,
} from '../../../../utils/models';
import { asProjectAdminUser, asProjectEditUser } from '../../../../utils/mockUsers';

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

describe('Permissions tab (projectRBAC)', () => {
  const namespace = 'test-project';
  const usersTable = projectRbacPermissions.getUsersTable();
  const groupsTable = projectRbacPermissions.getGroupsTable();

  beforeEach(() => {
    asProjectAdminUser();
  });

  type RoleBindingInterceptConfig = { items: ReturnType<typeof mockRoleBindingK8sResource>[] };

  const initProjectRbacIntercepts = (roleBindingsConfig?: RoleBindingInterceptConfig) => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        projectRBAC: true,
      }),
    );

    cy.interceptK8s(ProjectModel, mockProjectK8sResource({ k8sName: namespace }));
    cy.interceptK8sList(
      ProjectModel,
      mockK8sResourceList([mockProjectK8sResource({ k8sName: namespace })]),
    );

    const user1 = mockUserRoleBindingSubject({ name: 'test-user-1' });
    const group1 = mockGroupRoleBindingSubject({ name: 'test-group-1' });

    cy.interceptK8sList(
      { model: RoleModel, ns: namespace },
      mockK8sResourceList([
        mockRoleK8sResource({
          name: 'dashboard-role',
          namespace,
          labels: { 'opendatahub.io/dashboard': 'true' },
        }),
      ]),
    );

    cy.interceptK8sList(
      ClusterRoleModel,
      mockK8sResourceList([
        mockClusterRoleK8sResource({
          name: 'admin',
          labels: { 'kubernetes.io/bootstrapping': 'rbac-defaults' },
        }),
        mockClusterRoleK8sResource({
          name: 'edit',
          labels: { foo: 'bar' },
        }),
      ]),
    );

    const defaultRoleBindings = [
      mockRoleBindingK8sResource({
        name: 'rb-user-admin',
        namespace,
        subjects: [user1],
        roleRefKind: 'ClusterRole',
        roleRefName: 'admin',
        creationTimestamp: '2024-01-01T00:00:00Z',
      }),
      mockRoleBindingK8sResource({
        name: 'rb-user-edit',
        namespace,
        subjects: [user1],
        roleRefKind: 'ClusterRole',
        roleRefName: 'edit',
        creationTimestamp: '2024-02-01T00:00:00Z',
      }),
      mockRoleBindingK8sResource({
        name: 'rb-group-edit',
        namespace,
        subjects: [group1],
        roleRefKind: 'ClusterRole',
        roleRefName: 'edit',
        creationTimestamp: '2024-03-01T00:00:00Z',
      }),
    ];

    const rbConfig = roleBindingsConfig ?? { items: defaultRoleBindings };
    cy.interceptK8sList(
      { model: RoleBindingModel, ns: namespace },
      mockK8sResourceList(rbConfig.items),
    ).as('listRoleBindings');
  };

  it('should render Users/Groups role tables and allow filtering by friendly role names', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(namespace);

    // Add buttons open an inline add row
    projectRbacPermissions.findAddUserButton().should('be.enabled').click();
    projectRbacPermissions.findAddRow('user').should('exist');
    projectRbacPermissions.findAddGroupButton().should('be.enabled').click();
    projectRbacPermissions.findAddRow('group').should('exist');

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
    projectRbacPermissions.visit(namespace);

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

    projectRbacPermissions.visit(namespace);
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
    projectRbacPermissions.visit(namespace);

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

  it('should add a user role assignment and refresh the table', () => {
    const newUserName = 'test-user-new-1';
    const newUserSubject = mockUserRoleBindingSubject({ name: newUserName });
    const newRoleBinding = mockRoleBindingK8sResource({
      name: 'rb-user-2-edit',
      namespace,
      subjects: [newUserSubject],
      roleRefKind: 'ClusterRole',
      roleRefName: 'edit',
      creationTimestamp: '2024-04-01T00:00:00Z',
    });

    const roleBindingsPath = getK8sAPIResourceURL(RoleBindingModel, undefined, { ns: namespace });
    initProjectRbacIntercepts();

    // Single RoleBindings list intercept that can be "swapped" by updating a local variable.
    // This avoids relying on request ordering (StrictMode/double-fetch) and keeps the test simple.
    let roleBindingsItems: ReturnType<typeof mockRoleBindingK8sResource>[] = [];
    cy.intercept({ method: 'GET', pathname: roleBindingsPath }, (req) => {
      req.reply(mockK8sResourceList(roleBindingsItems));
    }).as('listRoleBindingsDynamic');

    cy.interceptK8s('POST', { model: RoleBindingModel, ns: namespace }, (req) => {
      roleBindingsItems = [newRoleBinding];
      req.reply(newRoleBinding);
    }).as('createRoleBinding');

    projectRbacPermissions.visit(namespace);
    cy.wait('@listRoleBindingsDynamic');
    projectRbacPermissions.findAddUserButton().should('be.enabled').click();
    projectRbacPermissions.findAddRow('user').should('exist');

    // Role dropdown is disabled until a subject is selected
    projectRbacPermissions.findAddRowRoleSelectToggle('user').should('be.disabled');

    projectRbacPermissions.selectAddRowSubject('user', newUserName);

    projectRbacPermissions.findAddRowRoleSelectToggle('user').should('not.be.disabled');
    projectRbacPermissions.selectAddRowRole('user', 'ClusterRole:edit');

    projectRbacPermissions.findAddRowSaveButton('user').should('not.be.disabled').click();

    cy.wait('@createRoleBinding').then((interception) => {
      expect(interception.request.body.metadata.namespace).to.eq(namespace);
      expect(interception.request.body.metadata.name).to.match(/^dashboard-permissions-/);
      expect(interception.request.body.metadata.labels).to.containSubset({
        'opendatahub.io/dashboard': 'true',
      });
      expect(interception.request.body.roleRef).to.eql({
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ClusterRole',
        name: 'edit',
      });
      expect(interception.request.body.subjects).to.eql([
        { apiGroup: 'rbac.authorization.k8s.io', kind: 'User', name: newUserName },
      ]);
    });

    cy.wait('@listRoleBindingsDynamic');
    usersTable.findNameCell(newUserName).should('exist');
    projectRbacPermissions.findAddRow('user').should('not.exist');
  });

  it('should patch an existing RoleBinding when adding a user to the same role', () => {
    const newUserName = 'test-user-new-2';
    const existingUserName = 'test-user-1';

    const existingUserSubject = mockUserRoleBindingSubject({ name: existingUserName });
    const newUserSubject = mockUserRoleBindingSubject({ name: newUserName });

    const roleBindingsPath = getK8sAPIResourceURL(RoleBindingModel, undefined, { ns: namespace });
    initProjectRbacIntercepts();

    let roleBindingsItems: ReturnType<typeof mockRoleBindingK8sResource>[] = [
      mockRoleBindingK8sResource({
        name: 'rb-user-edit',
        namespace,
        subjects: [existingUserSubject],
        roleRefKind: 'ClusterRole',
        roleRefName: 'edit',
        creationTimestamp: '2024-02-01T00:00:00Z',
      }),
    ];

    cy.intercept({ method: 'GET', pathname: roleBindingsPath }, (req) => {
      req.reply(mockK8sResourceList(roleBindingsItems));
    }).as('listRoleBindingsDynamic');

    cy.interceptK8s(
      'PATCH',
      { model: RoleBindingModel, ns: namespace, name: 'rb-user-edit' },
      (req) => {
        expect(req.body).to.have.length(1);
        expect(req.body[0]).to.containSubset({
          op: 'replace',
          path: '/subjects',
        });
        expect(req.body[0].value).to.containSubset([
          { apiGroup: 'rbac.authorization.k8s.io', kind: 'User', name: existingUserName },
          { apiGroup: 'rbac.authorization.k8s.io', kind: 'User', name: newUserName },
        ]);

        roleBindingsItems = [
          mockRoleBindingK8sResource({
            name: 'rb-user-edit',
            namespace,
            subjects: [existingUserSubject, newUserSubject],
            roleRefKind: 'ClusterRole',
            roleRefName: 'edit',
            creationTimestamp: '2024-02-01T00:00:00Z',
          }),
        ];

        req.reply(roleBindingsItems[0]);
      },
    ).as('patchRoleBindingSubjects');

    let createCount = 0;
    cy.interceptK8s('POST', { model: RoleBindingModel, ns: namespace }, (req) => {
      createCount += 1;
      req.reply(mockRoleBindingK8sResource({}));
    }).as('createRoleBindingShouldNotHappen');

    projectRbacPermissions.visit(namespace);
    cy.wait('@listRoleBindingsDynamic');

    projectRbacPermissions.findAddUserButton().should('be.enabled').click();
    projectRbacPermissions.findAddRow('user').should('exist');

    projectRbacPermissions.selectAddRowSubject('user', newUserName);
    projectRbacPermissions.selectAddRowRole('user', 'ClusterRole:edit');
    projectRbacPermissions.findAddRowSaveButton('user').should('not.be.disabled').click();

    cy.wait('@patchRoleBindingSubjects');
    cy.wait('@listRoleBindingsDynamic');

    usersTable.findNameCell(newUserName).should('exist');
    usersTable.findRoleLinkInRow(newUserName, 'Contributor').should('exist');
    projectRbacPermissions.findAddRow('user').should('not.exist');
    cy.wrap(null).then(() => {
      expect(createCount).to.eq(0);
    });
  });

  it('should hide the create option when the subject input exactly matches an existing subject', () => {
    initProjectRbacIntercepts();
    projectRbacPermissions.visit(namespace);

    projectRbacPermissions.findAddUserButton().should('be.enabled').click();
    projectRbacPermissions.findAddRow('user').should('exist');

    projectRbacPermissions.findAddRowSubjectInput('user').clear().type('test-user-1');
    projectRbacPermissions.findTypeaheadOption(/^test-user-1$/).should('exist');
    projectRbacPermissions
      .findTypeaheadOptions(/Assign role to "test-user-1"/)
      .should('have.length', 0);
  });

  it('should show an inline error when saving fails and keep the add row open', () => {
    initProjectRbacIntercepts();
    cy.interceptK8s(
      'PATCH',
      { model: RoleBindingModel, ns: namespace, name: 'rb-user-edit' },
      { forceNetworkError: true },
    ).as('patchRoleBindingSubjectsError');

    projectRbacPermissions.visit(namespace);
    projectRbacPermissions.findAddUserButton().should('be.enabled').click();
    projectRbacPermissions.findAddRow('user').should('exist');

    projectRbacPermissions.findAddRowSubjectInput('user').clear().type('test-user-3');
    projectRbacPermissions.selectAddRowSubject('user', 'test-user-3');
    // For this test we only care about the error handling path, not the exact role selected.
    // Pick a non-admin role to avoid collisions with any default/mock bindings that may already include admin.
    projectRbacPermissions.selectAddRowRole('user', 'ClusterRole:edit');

    projectRbacPermissions.findAddRowSaveButton('user').should('not.be.disabled').click();
    cy.wait('@patchRoleBindingSubjectsError');

    projectRbacPermissions.findAddRow('user').should('exist');
    projectRbacPermissions
      .findAddRowSaveError('user')
      .should('exist')
      .and('contain.text', 'Failed');
  });

  it('should edit a user role assignment (Admin -> Contributor) without confirmation modal', () => {
    const userName = 'test-user-1';
    const userSubject = mockUserRoleBindingSubject({ name: userName });
    const rbAdmin = mockRoleBindingK8sResource({
      name: 'rb-user-admin',
      namespace,
      subjects: [userSubject],
      roleRefKind: 'ClusterRole',
      roleRefName: 'admin',
      creationTimestamp: '2024-01-01T00:00:00Z',
    });
    const rbEdit = mockRoleBindingK8sResource({
      name: 'rb-user-edit',
      namespace,
      subjects: [userSubject],
      roleRefKind: 'ClusterRole',
      roleRefName: 'edit',
      creationTimestamp: '2024-02-01T00:00:00Z',
    });

    const roleBindingsPath = getK8sAPIResourceURL(RoleBindingModel, undefined, { ns: namespace });
    initProjectRbacIntercepts({ items: [rbAdmin] });

    let roleBindingsItems: ReturnType<typeof mockRoleBindingK8sResource>[] = [rbAdmin];
    cy.intercept({ method: 'GET', pathname: roleBindingsPath }, (req) => {
      req.reply(mockK8sResourceList(roleBindingsItems));
    }).as('listRoleBindingsDynamic');

    cy.interceptK8s('POST', { model: RoleBindingModel, ns: namespace }, (req) => {
      roleBindingsItems = [...roleBindingsItems, rbEdit];
      req.reply(rbEdit);
    }).as('createRoleBindingEdit');

    cy.interceptK8s(
      'DELETE',
      { model: RoleBindingModel, ns: namespace, name: rbAdmin.metadata.name },
      (req) => {
        roleBindingsItems = roleBindingsItems.filter(
          (rb) => rb.metadata.name !== rbAdmin.metadata.name,
        );
        req.reply(mock200Status({}));
      },
    ).as('deleteRoleBindingAdmin');

    projectRbacPermissions.visit(namespace);
    cy.wait('@listRoleBindingsDynamic');

    // Enter edit mode via kebab on the Admin row
    usersTable.getRowByRoleLink('Admin').findKebabAction('Edit').click();

    projectRbacPermissions.findEditRowSaveButton('user').should('be.disabled');
    projectRbacPermissions.selectEditRowRole('user', 'ClusterRole:edit');
    projectRbacPermissions.findEditRowSaveButton('user').should('not.be.disabled').click();

    cy.wait('@createRoleBindingEdit');
    cy.wait('@deleteRoleBindingAdmin');
    cy.wait('@listRoleBindingsDynamic');

    usersTable.findRoleLink('Contributor').should('exist');
    usersTable.findRoleLink('Admin').should('not.exist');
  });

  it('should not allow editing irreversible roles (Edit action hidden)', () => {
    const userName = 'test-user-1';
    const userSubject = mockUserRoleBindingSubject({ name: userName });
    const rbView = mockRoleBindingK8sResource({
      name: 'rb-user-view',
      namespace,
      subjects: [userSubject],
      roleRefKind: 'ClusterRole',
      roleRefName: 'view',
      creationTimestamp: '2024-01-01T00:00:00Z',
    });
    const rbAdmin = mockRoleBindingK8sResource({
      name: 'rb-user-admin',
      namespace,
      subjects: [userSubject],
      roleRefKind: 'ClusterRole',
      roleRefName: 'admin',
      creationTimestamp: '2024-02-01T00:00:00Z',
    });

    const roleBindingsPath = getK8sAPIResourceURL(RoleBindingModel, undefined, { ns: namespace });
    initProjectRbacIntercepts({ items: [rbView] });

    let roleBindingsItems: ReturnType<typeof mockRoleBindingK8sResource>[] = [rbView];
    cy.intercept({ method: 'GET', pathname: roleBindingsPath }, (req) => {
      req.reply(mockK8sResourceList(roleBindingsItems));
    }).as('listRoleBindingsDynamic');

    cy.interceptK8s('POST', { model: RoleBindingModel, ns: namespace }, (req) => {
      roleBindingsItems = [...roleBindingsItems, rbAdmin];
      req.reply(rbAdmin);
    }).as('createRoleBindingAdmin');

    cy.interceptK8s(
      'DELETE',
      { model: RoleBindingModel, ns: namespace, name: rbView.metadata.name },
      (req) => {
        roleBindingsItems = roleBindingsItems.filter(
          (rb) => rb.metadata.name !== rbView.metadata.name,
        );
        req.reply(mock200Status({}));
      },
    ).as('deleteRoleBindingView');

    projectRbacPermissions.visit(namespace);
    cy.wait('@listRoleBindingsDynamic');

    // For irreversible roles, Edit should not be available (only Unassign).
    const viewRow = usersTable.getRowByRoleLink('view');
    viewRow.findKebab().click();
    viewRow.findKebabAction('Edit', false).should('not.exist');
  });

  it('should remove a user role assignment after confirmation', () => {
    const userName = 'test-user-1';
    const userSubject = mockUserRoleBindingSubject({ name: userName });
    const rbAdmin = mockRoleBindingK8sResource({
      name: 'rb-user-admin',
      namespace,
      subjects: [userSubject],
      roleRefKind: 'ClusterRole',
      roleRefName: 'admin',
      creationTimestamp: '2024-01-01T00:00:00Z',
    });

    const roleBindingsPath = getK8sAPIResourceURL(RoleBindingModel, undefined, { ns: namespace });
    initProjectRbacIntercepts({ items: [rbAdmin] });

    let roleBindingsItems: ReturnType<typeof mockRoleBindingK8sResource>[] = [rbAdmin];
    cy.intercept({ method: 'GET', pathname: roleBindingsPath }, (req) => {
      req.reply(mockK8sResourceList(roleBindingsItems));
    }).as('listRoleBindingsDynamic');

    let deleteCount = 0;
    cy.interceptK8s(
      'DELETE',
      { model: RoleBindingModel, ns: namespace, name: rbAdmin.metadata.name },
      (req) => {
        deleteCount += 1;
        roleBindingsItems = [];
        req.reply(mock200Status({}));
      },
    ).as('deleteRoleBindingAdmin');

    projectRbacPermissions.visit(namespace);
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
      namespace,
      subjects: [userSubject],
      roleRefKind: 'ClusterRole',
      roleRefName: 'view',
      creationTimestamp: '2024-01-01T00:00:00Z',
    });

    const roleBindingsPath = getK8sAPIResourceURL(RoleBindingModel, undefined, { ns: namespace });
    initProjectRbacIntercepts({ items: [rbView] });

    const roleBindingsItems: ReturnType<typeof mockRoleBindingK8sResource>[] = [rbView];
    cy.intercept({ method: 'GET', pathname: roleBindingsPath }, (req) => {
      req.reply(mockK8sResourceList(roleBindingsItems));
    }).as('listRoleBindingsDynamic');

    cy.interceptK8s(
      'DELETE',
      { model: RoleBindingModel, ns: namespace, name: rbView.metadata.name },
      mock200Status({}),
    ).as('deleteRoleBindingView');

    projectRbacPermissions.visit(namespace);
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

  it('should cancel editing a user role assignment without making any changes', () => {
    const userName = 'test-user-1';
    const userSubject = mockUserRoleBindingSubject({ name: userName });
    const rbAdmin = mockRoleBindingK8sResource({
      name: 'rb-user-admin',
      namespace,
      subjects: [userSubject],
      roleRefKind: 'ClusterRole',
      roleRefName: 'admin',
      creationTimestamp: '2024-01-01T00:00:00Z',
    });

    const roleBindingsPath = getK8sAPIResourceURL(RoleBindingModel, undefined, { ns: namespace });
    initProjectRbacIntercepts({ items: [rbAdmin] });

    const roleBindingsItems: ReturnType<typeof mockRoleBindingK8sResource>[] = [rbAdmin];
    cy.intercept({ method: 'GET', pathname: roleBindingsPath }, (req) => {
      req.reply(mockK8sResourceList(roleBindingsItems));
    }).as('listRoleBindingsDynamic');

    // Track network calls to ensure cancel does not mutate.
    let createCount = 0;
    let deleteCount = 0;
    cy.interceptK8s('POST', { model: RoleBindingModel, ns: namespace }, (req) => {
      createCount += 1;
      req.reply(mockRoleBindingK8sResource({}));
    }).as('createRoleBindingEdit');
    cy.interceptK8s(
      'DELETE',
      { model: RoleBindingModel, ns: namespace, name: rbAdmin.metadata.name },
      (req) => {
        deleteCount += 1;
        req.reply(mock200Status({}));
      },
    ).as('deleteRoleBindingAdmin');

    projectRbacPermissions.visit(namespace);
    cy.wait('@listRoleBindingsDynamic');

    // Enter edit mode and change role selection
    usersTable.getRowByRoleLink('Admin').findKebabAction('Edit').click();
    projectRbacPermissions.selectEditRowRole('user', 'ClusterRole:edit');
    projectRbacPermissions.findEditRowSaveButton('user').should('not.be.disabled');

    // Cancel exits edit mode without any API calls
    projectRbacPermissions.findEditRowCancelButton('user').click();
    projectRbacPermissions.findEditRowRoleSelectToggle('user').should('not.exist');

    cy.wrap(null).then(() => {
      expect(createCount).to.eq(0);
      expect(deleteCount).to.eq(0);
    });

    // Original role remains
    usersTable.findRoleLink('Admin').should('exist');
  });
});
