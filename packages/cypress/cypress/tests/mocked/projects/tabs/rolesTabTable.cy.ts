/**
 * Tests for the Roles tab table: search filtering, kebab actions,
 * sorting, and the Preview YAML modal.
 */
import {
  mockClusterRoleK8sResource,
  mockDashboardConfig,
  mockK8sResourceList,
  mockProjectK8sResource,
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

const initIntercepts = ({
  roles = [
    mockRoleK8sResource({
      name: 'dashboard-custom',
      namespace: NAMESPACE,
      labels: { 'opendatahub.io/dashboard': 'true' },
    }),
  ],
  clusterRoles = [
    mockClusterRoleK8sResource({
      name: 'admin',
      labels: { 'kubernetes.io/bootstrapping': 'rbac-defaults' },
    }),
    mockClusterRoleK8sResource({
      name: 'edit',
      labels: { 'kubernetes.io/bootstrapping': 'rbac-defaults' },
    }),
    mockClusterRoleK8sResource({
      name: 'dashboard-cr',
      labels: { 'opendatahub.io/dashboard': 'true' },
    }),
  ],
}: {
  roles?: ReturnType<typeof mockRoleK8sResource>[];
  clusterRoles?: ReturnType<typeof mockClusterRoleK8sResource>[];
} = {}) => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ roleManagement: true }));
  cy.interceptK8s(ProjectModel, mockProjectK8sResource({ k8sName: NAMESPACE }));
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: NAMESPACE })]),
  );
  cy.interceptK8sList({ model: RoleModel, ns: NAMESPACE }, mockK8sResourceList(roles));
  cy.interceptK8sList(ClusterRoleModel, mockK8sResourceList(clusterRoles));
  cy.interceptK8sList({ model: RoleBindingModel, ns: NAMESPACE }, mockK8sResourceList([]));
};

describe('Roles tab table', () => {
  beforeEach(() => {
    asProjectAdminUser();
  });

  describe('search filtering', () => {
    it('should filter roles by name', () => {
      initIntercepts();
      projectRoles.visit(NAMESPACE);

      projectRoles.findSearchInput().type('Admin');
      projectRoles.getRow('Admin').find().should('exist');
      projectRoles.findRolesTable().contains('dashboard-custom').should('not.exist');
    });

    it('should filter roles by description', () => {
      initIntercepts();
      projectRoles.visit(NAMESPACE);

      projectRoles.findSearchInput().type('manage user access');
      projectRoles.getRow('Admin').find().should('exist');
      projectRoles.findRolesTable().contains('Contributor').should('not.exist');
    });

    it('should show empty state when no roles match search', () => {
      initIntercepts();
      projectRoles.visit(NAMESPACE);

      projectRoles.findSearchInput().type('nonexistent-role-xyz');
      projectRoles.findEmptyFilterState().should('exist');
    });

    it('should restore all rows when search is cleared', () => {
      initIntercepts();
      projectRoles.visit(NAMESPACE);

      projectRoles.findSearchInput().type('Admin');
      projectRoles.findRolesTable().find('tbody tr').should('have.length', 1);

      projectRoles.findSearchInput().clear();
      projectRoles.findRolesTable().find('tbody tr').should('have.length.greaterThan', 1);
    });
  });

  describe('kebab actions', () => {
    it('should disable Edit and Duplicate for ClusterRole entries', () => {
      initIntercepts();
      projectRoles.visit(NAMESPACE);

      const adminRow = projectRoles.getRow('Admin');
      adminRow.findKebabAction('Edit role', false).should('have.attr', 'aria-disabled', 'true');
      adminRow
        .findKebabAction('Duplicate role', false)
        .should('have.attr', 'aria-disabled', 'true');
      adminRow.findKebabAction('Preview YAML').should('not.have.attr', 'aria-disabled');
    });

    it('should enable Edit and Duplicate for namespace-scoped Role entries', () => {
      initIntercepts();
      projectRoles.visit(NAMESPACE);

      const customRow = projectRoles.getRow('dashboard-custom');
      customRow.findKebabAction('Edit role').should('not.have.attr', 'aria-disabled');
      customRow.findKebabAction('Duplicate role').should('not.have.attr', 'aria-disabled');
    });

    it('should open Preview YAML modal', () => {
      initIntercepts();
      projectRoles.visit(NAMESPACE);

      const adminRow = projectRoles.getRow('Admin');
      adminRow.findKebabAction('Preview YAML').click();

      projectRoles.findPreviewYAMLModal().should('exist');
      projectRoles.findPreviewYAMLModal().contains('Admin YAML').should('exist');
    });

    it('should close Preview YAML modal', () => {
      initIntercepts();
      projectRoles.visit(NAMESPACE);

      const adminRow = projectRoles.getRow('Admin');
      adminRow.findKebabAction('Preview YAML').click();

      projectRoles.findPreviewYAMLModal().should('exist');
      projectRoles.findPreviewYAMLCloseButton().click();
      projectRoles.findPreviewYAMLModal().should('not.exist');
    });
  });

  describe('sorting', () => {
    it('should sort by Role name', () => {
      initIntercepts();
      projectRoles.visit(NAMESPACE);

      projectRoles.findTableHeaderButton('Role name').click();
      projectRoles
        .findTableHeaderButton('Role name')
        .parents('th')
        .should('have.attr', 'aria-sort');
    });
  });
});
