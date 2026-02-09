/**
 * Shared utilities and intercepts for projectRBAC permissions tests.
 */
import {
  mockClusterRoleK8sResource,
  mockDashboardConfig,
  mockGroupRoleBindingSubject,
  mockK8sResourceList,
  mockProjectK8sResource,
  mockRoleK8sResource,
  mockUserRoleBindingSubject,
} from '@odh-dashboard/internal/__mocks__';
import { mockRoleBindingK8sResource } from '@odh-dashboard/internal/__mocks__/mockRoleBindingK8sResource';
import {
  ClusterRoleModel,
  ProjectModel,
  RoleBindingModel,
  RoleModel,
} from '../../../../utils/models';

export const NAMESPACE = 'test-project';

export type RoleBindingInterceptConfig = {
  items: ReturnType<typeof mockRoleBindingK8sResource>[];
};

/**
 * Initialize intercepts for projectRBAC tests.
 * Sets up dashboard config, project, roles, cluster roles, and role bindings.
 */
export const initProjectRbacIntercepts = (
  roleBindingsConfig?: RoleBindingInterceptConfig,
): void => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      projectRBAC: true,
    }),
  );

  cy.interceptK8s(ProjectModel, mockProjectK8sResource({ k8sName: NAMESPACE }));
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: NAMESPACE })]),
  );

  const user1 = mockUserRoleBindingSubject({ name: 'test-user-1' });
  const group1 = mockGroupRoleBindingSubject({ name: 'test-group-1' });

  cy.interceptK8sList(
    { model: RoleModel, ns: NAMESPACE },
    mockK8sResourceList([
      mockRoleK8sResource({
        name: 'dashboard-role',
        namespace: NAMESPACE,
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
      namespace: NAMESPACE,
      subjects: [user1],
      roleRefKind: 'ClusterRole',
      roleRefName: 'admin',
      creationTimestamp: '2024-01-01T00:00:00Z',
    }),
    mockRoleBindingK8sResource({
      name: 'rb-user-edit',
      namespace: NAMESPACE,
      subjects: [user1],
      roleRefKind: 'ClusterRole',
      roleRefName: 'edit',
      creationTimestamp: '2024-02-01T00:00:00Z',
    }),
    mockRoleBindingK8sResource({
      name: 'rb-group-edit',
      namespace: NAMESPACE,
      subjects: [group1],
      roleRefKind: 'ClusterRole',
      roleRefName: 'edit',
      creationTimestamp: '2024-03-01T00:00:00Z',
    }),
  ];

  const rbConfig = roleBindingsConfig ?? { items: defaultRoleBindings };
  cy.interceptK8sList(
    { model: RoleBindingModel, ns: NAMESPACE },
    mockK8sResourceList(rbConfig.items),
  ).as('listRoleBindings');
};

// Re-export mocks for convenience
export {
  mockClusterRoleK8sResource,
  mockGroupRoleBindingSubject,
  mockK8sResourceList,
  mockRoleBindingK8sResource,
  mockUserRoleBindingSubject,
};
