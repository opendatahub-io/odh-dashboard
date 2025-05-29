import { mockDscStatus, mockK8sResourceList, mockProjectK8sResource } from '#~/__mocks__';
import { mock200Status } from '#~/__mocks__/mockK8sStatus';
import { mockRoleBindingK8sResource } from '#~/__mocks__/mockRoleBindingK8sResource';
import { be } from '#~/__tests__/cypress/cypress/utils/should';
import {
  GroupModel,
  ModelRegistryModel,
  ProjectModel,
} from '#~/__tests__/cypress/cypress/utils/models';
import type { RoleBindingSubject } from '#~/k8sTypes';
import {
  asProductAdminUser,
  asProjectEditUser,
} from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { mockModelRegistry } from '#~/__mocks__/mockModelRegistry';
import { mockGroup } from '#~/__mocks__/mockGroup';
import { modelRegistryPermissions } from '#~/__tests__/cypress/cypress/pages/modelRegistryPermissions';

const MODEL_REGISTRY_DEFAULT_NAMESPACE = 'odh-model-registries';

const userSubjects: RoleBindingSubject[] = [
  {
    kind: 'User',
    apiGroup: 'rbac.authorization.k8s.io',
    name: 'example-mr-user',
  },
];

const groupSubjects: RoleBindingSubject[] = [
  {
    kind: 'Group',
    apiGroup: 'rbac.authorization.k8s.io',
    name: 'example-mr-users',
  },
];

const projectSubjects: RoleBindingSubject[] = [
  {
    kind: 'Group',
    apiGroup: 'rbac.authorization.k8s.io',
    name: 'system:serviceaccounts:test-project',
  },
];

type HandlersProps = {
  isEmpty?: boolean;
  hasPermission?: boolean;
};

const initIntercepts = ({ isEmpty = false, hasPermission = true }: HandlersProps) => {
  if (!hasPermission) {
    asProjectEditUser();
  } else {
    asProductAdminUser();
  }
  cy.interceptOdh('GET /api/dsc/status', mockDscStatus({}));
  cy.interceptK8sList(
    ModelRegistryModel,
    mockK8sResourceList([
      mockModelRegistry({ name: 'example-mr', namespace: MODEL_REGISTRY_DEFAULT_NAMESPACE }),
    ]),
  );
  cy.interceptK8sList(
    { model: GroupModel },
    mockK8sResourceList([mockGroup({ name: 'example-mr-group-option' })]),
  );
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({}),
      mockProjectK8sResource({ k8sName: 'project-name', displayName: 'Project' }),
    ]),
  );
  cy.interceptOdh(
    'GET /api/modelRegistryRoleBindings',
    mockK8sResourceList(
      isEmpty
        ? []
        : [
            mockRoleBindingK8sResource({
              namespace: MODEL_REGISTRY_DEFAULT_NAMESPACE,
              name: 'example-mr-user',
              subjects: userSubjects,
              roleRefName: 'registry-user-example-mr',
              modelRegistryName: 'example-mr',
            }),
            mockRoleBindingK8sResource({
              namespace: MODEL_REGISTRY_DEFAULT_NAMESPACE,
              name: 'example-mr-user-2',
              subjects: [{ ...userSubjects[0], name: 'example-mr-user-2' }],
              roleRefName: 'registry-user-example-mr',
              modelRegistryName: 'example-mr',
            }),
            mockRoleBindingK8sResource({
              namespace: MODEL_REGISTRY_DEFAULT_NAMESPACE,
              name: 'example-mr-users',
              subjects: groupSubjects,
              roleRefName: 'registry-user-example-mr',
              modelRegistryName: 'example-mr',
            }),
            mockRoleBindingK8sResource({
              namespace: MODEL_REGISTRY_DEFAULT_NAMESPACE,
              name: 'example-mr-users-2',
              subjects: [{ ...groupSubjects[0], name: 'example-mr-users-2' }],
              roleRefName: 'registry-user-example-mr',
              modelRegistryName: 'example-mr',
            }),
            mockRoleBindingK8sResource({
              namespace: MODEL_REGISTRY_DEFAULT_NAMESPACE,
              subjects: projectSubjects,
              roleRefName: 'registry-user-example-mr',
              modelRegistryName: 'example-mr',
              isProjectSubject: true,
            }),
          ],
    ),
  );
};

describe('MR Permissions', () => {
  const usersTab = modelRegistryPermissions.getUsersContent();
  const projectsTab = modelRegistryPermissions.getProjectsContent();
  const userTable = usersTab.getUserTable();
  const groupTable = usersTab.getGroupTable();
  const projectTable = projectsTab.getProjectTable();

  it('should not be accessible for non-project admins', () => {
    initIntercepts({ isEmpty: false, hasPermission: false });
    modelRegistryPermissions.visit('example-mr', false);
    cy.findByTestId('not-found-page').should('exist');
  });

  it('redirect if no modelregistry', () => {
    initIntercepts({ isEmpty: true });
    modelRegistryPermissions.visit('example-mr');
    cy.url().should('include', `/modelRegistrySettings`);
  });

  describe('Users table', () => {
    it('Table sorting for users table', () => {
      initIntercepts({ isEmpty: false });
      modelRegistryPermissions.visit('example-mr');
      userTable.findRows().should('have.length', 2);

      // by name
      userTable.findTableHeaderButton('Name').click();
      userTable.findTableHeaderButton('Name').should(be.sortDescending);
      userTable.findTableHeaderButton('Name').click();
      userTable.findTableHeaderButton('Name').should(be.sortAscending);

      //by date added
      userTable.findTableHeaderButton('Date added').click();
      userTable.findTableHeaderButton('Date added').should(be.sortAscending);
      userTable.findTableHeaderButton('Date added').click();
      userTable.findTableHeaderButton('Date added').should(be.sortDescending);
    });

    it('Add user', () => {
      initIntercepts({ isEmpty: false });
      cy.interceptOdh(
        'POST /api/modelRegistryRoleBindings',
        mockRoleBindingK8sResource({
          namespace: MODEL_REGISTRY_DEFAULT_NAMESPACE,
          name: 'new-example-mr-user',
          subjects: userSubjects,
          roleRefName: 'registry-user-example-mr',
          modelRegistryName: 'example-mr',
        }),
      ).as('addUser');
      modelRegistryPermissions.visit('example-mr');

      usersTab.findAddUserButton().click();

      userTable.findAddInput().fill('new-example-mr-user');
      userTable.findSaveNewButton().click();

      cy.wait('@addUser').then((interception) => {
        expect(interception.request.body).to.containSubset({
          metadata: {
            labels: {
              app: 'example-mr',
              'app.kubernetes.io/component': 'model-registry',
              'app.kubernetes.io/part-of': 'model-registry',
              'app.kubernetes.io/name': 'example-mr',
              'opendatahub.io/dashboard': 'true',
              component: 'model-registry',
            },
          },
          roleRef: {
            apiGroup: 'rbac.authorization.k8s.io',
            kind: 'Role',
            name: 'registry-user-example-mr',
          },
          subjects: [
            { apiGroup: 'rbac.authorization.k8s.io', kind: 'User', name: 'new-example-mr-user' },
          ],
        });
      });
    });

    it('Edit user', () => {
      initIntercepts({ isEmpty: false });
      cy.interceptOdh(
        'POST /api/modelRegistryRoleBindings',
        mockRoleBindingK8sResource({
          namespace: MODEL_REGISTRY_DEFAULT_NAMESPACE,
          name: 'edited-user',
          subjects: [{ ...userSubjects[0], name: 'edited-user' }],
          roleRefName: 'registry-user-example-mr',
          modelRegistryName: 'example-mr',
        }),
      ).as('editUser');
      cy.interceptOdh(
        'DELETE /api/modelRegistryRoleBindings/:name',
        { path: { name: 'example-mr-user' } },
        mock200Status({}),
      ).as('deleteUser');

      modelRegistryPermissions.visit('example-mr');

      userTable.getTableRow('example-mr-user').findKebabAction('Edit').click();
      userTable.findEditInput('example-mr-user').clear().type('edited-user');
      userTable.findEditSaveButton('edited-user').click();

      cy.wait('@editUser').then((interception) => {
        expect(interception.request.body).to.containSubset({
          metadata: {
            labels: {
              app: 'example-mr',
              'app.kubernetes.io/component': 'model-registry',
              'app.kubernetes.io/part-of': 'model-registry',
              'app.kubernetes.io/name': 'example-mr',
              'opendatahub.io/dashboard': 'true',
              component: 'model-registry',
            },
          },
          roleRef: {
            apiGroup: 'rbac.authorization.k8s.io',
            kind: 'Role',
            name: 'registry-user-example-mr',
          },
          subjects: [{ apiGroup: 'rbac.authorization.k8s.io', kind: 'User', name: 'edited-user' }],
        });
      });
      cy.wait('@deleteUser');
    });

    it('Delete user', () => {
      initIntercepts({ isEmpty: false });

      cy.interceptOdh(
        'DELETE /api/modelRegistryRoleBindings/:name',
        { path: { name: 'example-mr-user' } },
        mock200Status({}),
      ).as('deleteUser');

      modelRegistryPermissions.visit('example-mr');

      userTable.getTableRow('example-mr-user').findKebabAction('Delete').click();

      cy.wait('@deleteUser');
    });
  });

  describe('Groups table', () => {
    it('Table sorting for groups table', () => {
      initIntercepts({ isEmpty: false });

      modelRegistryPermissions.visit('example-mr');

      groupTable.findTableHeaderButton('Name').click();
      groupTable.findTableHeaderButton('Name').should(be.sortDescending);
      groupTable.findTableHeaderButton('Name').click();
      groupTable.findTableHeaderButton('Name').should(be.sortAscending);

      groupTable.findTableHeaderButton('Date added').click();
      groupTable.findTableHeaderButton('Date added').should(be.sortAscending);
      groupTable.findTableHeaderButton('Date added').click();
      groupTable.findTableHeaderButton('Date added').should(be.sortDescending);
    });

    it('Add group', () => {
      initIntercepts({ isEmpty: false });
      cy.interceptOdh(
        'POST /api/modelRegistryRoleBindings',
        mockRoleBindingK8sResource({
          namespace: MODEL_REGISTRY_DEFAULT_NAMESPACE,
          name: 'new-example-mr-group',
          subjects: groupSubjects,
          roleRefName: 'registry-user-example-mr',
          modelRegistryName: 'example-mr',
        }),
      ).as('addGroup');
      modelRegistryPermissions.visit('example-mr');

      usersTab.findAddGroupButton().click();

      // Type the group name into the input
      groupTable.findNameSelect().type('new-example-mr-group');

      // Wait for the dropdown to appear and select the option
      cy.contains('new-example-mr-group', { timeout: 10000 }).should('be.visible').click();

      groupTable.findSaveNewButton().click();

      cy.wait('@addGroup').then((interception) => {
        expect(interception.request.body).to.containSubset({
          metadata: {
            labels: {
              app: 'example-mr',
              'app.kubernetes.io/component': 'model-registry',
              'app.kubernetes.io/part-of': 'model-registry',
              'app.kubernetes.io/name': 'example-mr',
              'opendatahub.io/dashboard': 'true',
              component: 'model-registry',
            },
          },
          roleRef: {
            apiGroup: 'rbac.authorization.k8s.io',
            kind: 'Role',
            name: 'registry-user-example-mr',
          },
          subjects: [
            { apiGroup: 'rbac.authorization.k8s.io', kind: 'Group', name: 'new-example-mr-group' },
          ],
        });
      });
    });

    it('Edit group', () => {
      initIntercepts({ isEmpty: false });
      cy.interceptOdh(
        'POST /api/modelRegistryRoleBindings',
        mockRoleBindingK8sResource({
          namespace: MODEL_REGISTRY_DEFAULT_NAMESPACE,
          name: 'example-mr-group-option',
          subjects: [{ ...groupSubjects[0], name: 'example-mr-group-option' }],
          roleRefName: 'registry-user-example-mr',
          modelRegistryName: 'example-mr',
        }),
      ).as('editGroup');
      cy.interceptOdh(
        'DELETE /api/modelRegistryRoleBindings/:name',
        { path: { name: 'example-mr-users-2' } },
        mock200Status({}),
      ).as('deleteGroup');

      modelRegistryPermissions.visit('example-mr');

      groupTable.getTableRow('example-mr-users-2').findKebabAction('Edit').click();
      groupTable.findNameSelect().clear().type('example-mr-group-opti');
      cy.findByText('example-mr-group-option').click();
      groupTable.findEditSaveButton('example-mr-group-option').click();

      cy.wait('@editGroup').then((interception) => {
        expect(interception.request.body).to.containSubset({
          metadata: {
            labels: {
              'opendatahub.io/dashboard': 'true',
              app: 'example-mr',
              'app.kubernetes.io/component': 'model-registry',
              'app.kubernetes.io/part-of': 'model-registry',
              'app.kubernetes.io/name': 'example-mr',
              component: 'model-registry',
            },
          },
          roleRef: {
            apiGroup: 'rbac.authorization.k8s.io',
            kind: 'Role',
            name: 'registry-user-example-mr',
          },
          subjects: [
            {
              apiGroup: 'rbac.authorization.k8s.io',
              kind: 'Group',
              name: 'example-mr-group-option',
            },
          ],
        });
      });
      cy.wait('@deleteGroup');
    });

    it('Delete group', () => {
      initIntercepts({ isEmpty: false });

      cy.interceptOdh(
        'DELETE /api/modelRegistryRoleBindings/:name',
        { path: { name: 'example-mr-users-2' } },
        mock200Status({}),
      ).as('deleteGroup');

      modelRegistryPermissions.visit('example-mr');
      groupTable.getTableRow('example-mr-users-2').findKebabAction('Delete').click();

      cy.wait('@deleteGroup');
    });

    it('Disabled actions on default group', () => {
      initIntercepts({ isEmpty: false });
      modelRegistryPermissions.visit('example-mr');

      cy.contains('td', 'example-mr-users')
        .closest('tr')
        .within(() => {
          cy.get('button[aria-disabled="true"]')
            .should('exist')
            .and(
              'have.attr',
              'aria-label',
              'The default group always has access to model registry.',
            )
            .find('svg')
            .should('exist');
        });

      cy.contains('td', 'example-mr-users-2')
        .closest('tr')
        .within(() => {
          cy.get('button:not([aria-disabled="true"])').should('exist').and('be.visible');
        });
    });
  });

  describe('Projects table', () => {
    beforeEach(() => {
      initIntercepts({ isEmpty: false });
      modelRegistryPermissions.visit('example-mr');
      modelRegistryPermissions.findProjectTab().click();
    });

    it('table sorting', () => {
      // by name
      projectTable.findTableHeaderButton('Name').click();
      projectTable.findTableHeaderButton('Name').should(be.sortDescending);
      projectTable.findTableHeaderButton('Name').click();
      projectTable.findTableHeaderButton('Name').should(be.sortAscending);
      //by permissions
      projectTable.findTableHeaderButton('Permission').click();
      projectTable.findTableHeaderButton('Permission').should(be.sortAscending);
      projectTable.findTableHeaderButton('Permission').click();
      projectTable.findTableHeaderButton('Permission').should(be.sortDescending);
      //by date added
      projectTable.findTableHeaderButton('Date added').click();
      projectTable.findTableHeaderButton('Date added').should(be.sortAscending);
      projectTable.findTableHeaderButton('Date added').click();
      projectTable.findTableHeaderButton('Date added').should(be.sortDescending);
    });

    it('Add project', () => {
      cy.interceptOdh(
        'POST /api/modelRegistryRoleBindings',
        mockRoleBindingK8sResource({
          subjects: projectSubjects,
          roleRefName: 'registry-user-example-mr',
          modelRegistryName: 'example-mr',
        }),
      ).as('addProject');

      projectsTab.findAddProjectButton().click();
      projectTable.findNameSelect().findSelectOption('Project').click();
      projectTable.findSaveNewButton().click();

      cy.wait('@addProject').then((interception) => {
        expect(interception.request.body).to.containSubset({
          roleRef: {
            apiGroup: 'rbac.authorization.k8s.io',
            kind: 'Role',
            name: 'registry-user-example-mr',
          },
          subjects: [
            {
              apiGroup: 'rbac.authorization.k8s.io',
              kind: 'Group',
              name: 'system:serviceaccounts:project-name',
            },
          ],
        });
      });
    });

    it('Edit project', () => {
      cy.interceptOdh(
        'POST /api/modelRegistryRoleBindings',
        mockRoleBindingK8sResource({
          namespace: MODEL_REGISTRY_DEFAULT_NAMESPACE,
          subjects: projectSubjects,
          roleRefName: 'registry-user-example-mr',
          modelRegistryName: 'example-mr',
        }),
      ).as('editProject');
      cy.interceptOdh(
        'DELETE /api/modelRegistryRoleBindings/:name',
        { path: { name: 'test-name-view' } },
        mock200Status({}),
      ).as('deleteProject');

      projectTable.getTableRow('Test Project').findKebabAction('Edit').click();
      projectTable.findNameSelect().findSelectOption('Project').click();
      projectTable.findEditSaveButton('Project').click();

      cy.wait('@editProject').then((interception) => {
        expect(interception.request.body).to.containSubset({
          roleRef: {
            apiGroup: 'rbac.authorization.k8s.io',
            kind: 'Role',
            name: 'registry-user-example-mr',
          },
          subjects: [
            {
              apiGroup: 'rbac.authorization.k8s.io',
              kind: 'Group',
              name: 'system:serviceaccounts:project-name',
            },
          ],
        });
      });
      cy.wait('@deleteProject');
    });

    it('Delete project', () => {
      cy.interceptOdh(
        'DELETE /api/modelRegistryRoleBindings/:name',
        { path: { name: 'test-name-view' } },
        mock200Status({}),
      ).as('deleteProject');
      projectTable.getTableRow('Test Project').findKebabAction('Delete').click();
      cy.wait('@deleteProject');
    });
  });
});
