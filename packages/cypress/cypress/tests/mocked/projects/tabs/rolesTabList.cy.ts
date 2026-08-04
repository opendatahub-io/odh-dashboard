/**
 * Tests for the Roles list table: search integration, kebab actions
 * (edit, duplicate, preview YAML), and ClusterRole disabled actions.
 */
import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockRoleK8sResource,
  mockClusterRoleK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import {
  ClusterRoleModel,
  ProjectModel,
  RoleBindingModel,
  RoleModel,
} from '../../../../utils/models';
import { asProjectAdminUser } from '../../../../utils/mockUsers';
import { projectRoles } from '../../../../pages/projectRoles';

const NAMESPACE = 'test-project';

const dashboardRole1 = mockRoleK8sResource({
  name: 'workbench-admin',
  namespace: NAMESPACE,
  labels: { 'opendatahub.io/dashboard': 'true' },
  rules: [{ verbs: ['get', 'list'], apiGroups: ['apps'], resources: ['deployments'] }],
});
dashboardRole1.metadata.annotations = {
  'openshift.io/display-name': 'Workbench Admin',
  'openshift.io/description': 'Admin access to workbenches',
};

const dashboardRole2 = mockRoleK8sResource({
  name: 'pipeline-viewer',
  namespace: NAMESPACE,
  labels: { 'opendatahub.io/dashboard': 'true' },
  rules: [{ verbs: ['get', 'list'], apiGroups: [''], resources: ['pods'] }],
});
dashboardRole2.metadata.annotations = {
  'openshift.io/display-name': 'Pipeline Viewer',
  'openshift.io/description': 'Read-only access to pipelines',
};

const dashboardClusterRole = mockClusterRoleK8sResource({
  name: 'dashboard-cluster-role',
  labels: { 'opendatahub.io/dashboard': 'true' },
  rules: [{ verbs: ['get'], apiGroups: [''], resources: ['namespaces'] }],
});
dashboardClusterRole.metadata.annotations = {
  'openshift.io/display-name': 'Dashboard Cluster Role',
};

const initIntercepts = () => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ roleManagement: true }));
  cy.interceptK8s(ProjectModel, mockProjectK8sResource({ k8sName: NAMESPACE }));
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: NAMESPACE })]),
  );
  cy.interceptK8sList(
    { model: RoleModel, ns: NAMESPACE },
    mockK8sResourceList([dashboardRole1, dashboardRole2]),
  );
  cy.interceptK8sList(ClusterRoleModel, mockK8sResourceList([dashboardClusterRole]));
  cy.interceptK8sList({ model: RoleBindingModel, ns: NAMESPACE }, mockK8sResourceList([]));
};

describe('Roles list table', () => {
  beforeEach(() => {
    asProjectAdminUser();
    initIntercepts();
    projectRoles.visit(NAMESPACE);
  });

  it('should filter roles by search and show empty filter state', () => {
    projectRoles.findRolesTable().should('exist');

    projectRoles.findSearchInput().type('Pipeline');
    projectRoles
      .findRolesTable()
      .findAllByTestId('role-name-link')
      .should('have.length', 1)
      .first()
      .should('have.text', 'Pipeline Viewer');

    projectRoles.findSearchInput().clear().type('nonexistent-role-xyz');
    projectRoles.findEmptyFilterState().should('exist');
  });

  it('should navigate to edit page from kebab menu', () => {
    projectRoles.getRow('Workbench Admin').findKebabAction('Edit role').click();
    cy.url().should('include', `/roles/workbench-admin/edit`);
  });

  it('should navigate to duplicate page from kebab menu', () => {
    projectRoles.getRow('Workbench Admin').findKebabAction('Duplicate role').click();
    cy.url().should('include', `/roles/workbench-admin/duplicate`);
  });

  it('should open and close preview YAML modal from kebab menu', () => {
    projectRoles.getRow('Workbench Admin').findKebabAction('Preview YAML').click();
    projectRoles.findPreviewYAMLModal().should('exist');
    projectRoles.findPreviewYAMLCloseButton().click();
    projectRoles.findPreviewYAMLModal().should('not.exist');
  });

  it('should disable edit and duplicate for cluster roles', () => {
    projectRoles
      .getRow('Dashboard Cluster Role')
      .findKebabAction('Edit role')
      .should('have.attr', 'aria-disabled', 'true');
    projectRoles
      .getRow('Dashboard Cluster Role')
      .findKebabAction('Duplicate role')
      .should('have.attr', 'aria-disabled', 'true');
    projectRoles
      .getRow('Dashboard Cluster Role')
      .findKebabAction('Preview YAML')
      .should('not.have.attr', 'aria-disabled');
  });
});
