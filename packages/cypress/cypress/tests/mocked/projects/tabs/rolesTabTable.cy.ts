/**
 * Tests for the Roles tab table: rendering rows, search filtering, kebab actions,
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

  it('should render all relevant roles in the table', () => {
    initIntercepts();
    projectRoles.visit(NAMESPACE);

    projectRoles.findRolesTable().should('exist');
    projectRoles.getRow('dashboard-custom').find().should('exist');
    projectRoles.getRow('Admin').find().should('exist');
    projectRoles.getRow('Contributor').find().should('exist');
    projectRoles.getRow('dashboard-cr').find().should('exist');
  });

  it('should show AI role badge on dashboard-labeled roles and default roles', () => {
    initIntercepts();
    projectRoles.visit(NAMESPACE);

    projectRoles.getRow('Admin').findType().contains('AI role').should('exist');
    projectRoles.getRow('Contributor').findType().contains('AI role').should('exist');
    projectRoles.getRow('dashboard-custom').findType().contains('AI role').should('exist');
  });

  it('should show OpenShift default role badge on admin/edit cluster roles', () => {
    initIntercepts();
    projectRoles.visit(NAMESPACE);

    projectRoles.getRow('Admin').findType().contains('OpenShift default role').should('exist');
    projectRoles
      .getRow('Contributor')
      .findType()
      .contains('OpenShift default role')
      .should('exist');
    projectRoles
      .getRow('dashboard-custom')
      .findType()
      .contains('OpenShift default role')
      .should('not.exist');
  });

  it('should show Cluster role badge on ClusterRole entries', () => {
    initIntercepts();
    projectRoles.visit(NAMESPACE);

    projectRoles.getRow('Admin').findType().contains('Cluster role').should('exist');
    projectRoles.getRow('dashboard-cr').findType().contains('Cluster role').should('exist');
    projectRoles.getRow('dashboard-custom').findType().contains('Cluster role').should('not.exist');
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

  describe('empty state', () => {
    it('should show empty state when no roles exist', () => {
      initIntercepts({ roles: [], clusterRoles: [] });
      projectRoles.visit(NAMESPACE);

      projectRoles.findEmptyState().should('exist');
      projectRoles.findEmptyState().contains('No custom roles').should('exist');
    });

    it('should show Create custom role button in empty state', () => {
      initIntercepts({ roles: [], clusterRoles: [] });
      projectRoles.visit(NAMESPACE);

      projectRoles.findEmptyState().findByTestId('create-role-button').should('exist');
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
