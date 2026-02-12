import { act, renderHook } from '@testing-library/react';
import {
  mockClusterRoleK8sResource,
  mockRoleBindingK8sResource,
  mockRoleK8sResource,
  mockUserRoleBindingSubject,
  mockGroupRoleBindingSubject,
} from '#~/__mocks__';
import type { RoleBindingKind, ClusterRoleKind, RoleKind } from '#~/k8sTypes';
import type { RoleRef } from '#~/concepts/permissions/types';
import useManageRolesData from '#~/pages/projects/projectPermissions/manageRoles/useManageRolesData';

const mockUsePermissionsContext = jest.fn();

jest.mock('#~/concepts/permissions/PermissionsContext', () => ({
  usePermissionsContext: () => mockUsePermissionsContext(),
}));

describe('useManageRolesData', () => {
  const namespace = 'test-ns';
  const roleRefAdmin: RoleRef = { kind: 'ClusterRole', name: 'admin' };
  const roleRefCustom: RoleRef = { kind: 'Role', name: 'custom-role' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('existingSubjectNames', () => {
    it('should return sorted user names from role bindings', () => {
      const userA = mockUserRoleBindingSubject({ name: 'zara' });
      const userB = mockUserRoleBindingSubject({ name: 'alice' });
      const roleBindings: RoleBindingKind[] = [
        mockRoleBindingK8sResource({
          name: 'rb-1',
          namespace,
          roleRefKind: 'ClusterRole',
          roleRefName: 'admin',
          subjects: [userA],
        }),
        mockRoleBindingK8sResource({
          name: 'rb-2',
          namespace,
          roleRefKind: 'ClusterRole',
          roleRefName: 'edit',
          subjects: [userB],
        }),
      ];

      mockUsePermissionsContext.mockReturnValue({
        roles: { data: [] },
        clusterRoles: { data: [] },
        roleBindings: { data: roleBindings },
      });

      const { result } = renderHook(() => useManageRolesData('user', ''));

      expect(result.current.existingSubjectNames).toEqual(['alice', 'zara']);
    });

    it('should return group names when subjectKind is group', () => {
      const group = mockGroupRoleBindingSubject({ name: 'my-group' });
      const user = mockUserRoleBindingSubject({ name: 'alice' });
      const roleBindings: RoleBindingKind[] = [
        mockRoleBindingK8sResource({
          name: 'rb-1',
          namespace,
          roleRefKind: 'ClusterRole',
          roleRefName: 'admin',
          subjects: [group, user],
        }),
      ];

      mockUsePermissionsContext.mockReturnValue({
        roles: { data: [] },
        clusterRoles: { data: [] },
        roleBindings: { data: roleBindings },
      });

      const { result } = renderHook(() => useManageRolesData('group', ''));

      expect(result.current.existingSubjectNames).toEqual(['my-group']);
    });
  });

  describe('changes tracking', () => {
    it('should return no changes when subject name is empty', () => {
      mockUsePermissionsContext.mockReturnValue({
        roles: { data: [] },
        clusterRoles: { data: [] },
        roleBindings: { data: [] },
      });

      const { result } = renderHook(() => useManageRolesData('user', '  '));

      expect(result.current.trimmedSubjectName).toBe('');
      expect(result.current.hasChanges).toBe(false);
      expect(result.current.changes).toEqual({
        assigning: [],
        unassigning: [],
      });
    });

    it('should mark assigning when a new subject selects a role', () => {
      mockUsePermissionsContext.mockReturnValue({
        roles: { data: [] },
        clusterRoles: { data: [] },
        roleBindings: { data: [] },
      });

      const { result } = renderHook(() => useManageRolesData('user', 'alice'));

      act(() => {
        result.current.toggleSelection(roleRefAdmin);
      });

      expect(result.current.hasChanges).toBe(true);
      expect(result.current.changes.assigning).toHaveLength(1);
      expect(result.current.changes.assigning[0].roleRef).toEqual(roleRefAdmin);
      expect(result.current.changes.unassigning).toHaveLength(0);
    });

    it('should mark unassigning custom roles for existing subjects', () => {
      const user = mockUserRoleBindingSubject({ name: 'bob' });
      const roleBindings: RoleBindingKind[] = [
        mockRoleBindingK8sResource({
          name: 'rb-custom',
          namespace,
          roleRefKind: 'Role',
          roleRefName: roleRefCustom.name,
          subjects: [user],
        }),
      ];

      mockUsePermissionsContext.mockReturnValue({
        roles: { data: [] },
        clusterRoles: { data: [] },
        roleBindings: { data: roleBindings },
      });

      const { result } = renderHook(() => useManageRolesData('user', 'bob'));

      act(() => {
        result.current.toggleSelection(roleRefCustom);
      });

      expect(result.current.hasChanges).toBe(true);
      expect(result.current.changes.unassigning).toHaveLength(1);
      expect(result.current.changes.unassigning[0].roleRef).toEqual(roleRefCustom);
    });
  });

  describe('role list composition', () => {
    it('should include default roles (admin, edit) for new subjects', () => {
      const clusterRoles: ClusterRoleKind[] = [
        mockClusterRoleK8sResource({
          name: 'admin',
          labels: { 'kubernetes.io/bootstrapping': 'rbac-defaults' },
        }),
        mockClusterRoleK8sResource({
          name: 'edit',
          labels: { 'kubernetes.io/bootstrapping': 'rbac-defaults' },
        }),
      ];

      mockUsePermissionsContext.mockReturnValue({
        roles: { data: [] },
        clusterRoles: { data: clusterRoles },
        roleBindings: { data: [] },
      });

      const { result } = renderHook(() => useManageRolesData('user', 'new-user'));

      const roleNames = result.current.rows.map((r) => r.roleRef.name);
      expect(roleNames).toContain('admin');
      expect(roleNames).toContain('edit');
    });

    it('should include dashboard-labeled roles for new subjects', () => {
      const roles: RoleKind[] = [
        mockRoleK8sResource({
          name: 'dashboard-role',
          namespace,
          labels: { 'opendatahub.io/dashboard': 'true' },
        }),
      ];
      const clusterRoles: ClusterRoleKind[] = [
        mockClusterRoleK8sResource({
          name: 'admin',
          labels: { 'kubernetes.io/bootstrapping': 'rbac-defaults' },
        }),
      ];

      mockUsePermissionsContext.mockReturnValue({
        roles: { data: roles },
        clusterRoles: { data: clusterRoles },
        roleBindings: { data: [] },
      });

      const { result } = renderHook(() => useManageRolesData('user', 'new-user'));

      const roleNames = result.current.rows.map((r) => r.roleRef.name);
      expect(roleNames).toContain('dashboard-role');
      expect(roleNames).toContain('admin');
    });

    it('should include assigned custom roles for existing subjects', () => {
      const user = mockUserRoleBindingSubject({ name: 'existing-user' });
      const roleBindings: RoleBindingKind[] = [
        mockRoleBindingK8sResource({
          name: 'rb-custom',
          namespace,
          roleRefKind: 'ClusterRole',
          roleRefName: 'custom-cluster-role',
          subjects: [user],
        }),
      ];
      const clusterRoles: ClusterRoleKind[] = [
        mockClusterRoleK8sResource({
          name: 'admin',
          labels: { 'kubernetes.io/bootstrapping': 'rbac-defaults' },
        }),
        mockClusterRoleK8sResource({
          name: 'custom-cluster-role',
          labels: {}, // Explicitly no dashboard label, so it's a custom role
        }),
      ];

      mockUsePermissionsContext.mockReturnValue({
        roles: { data: [] },
        clusterRoles: { data: clusterRoles },
        roleBindings: { data: roleBindings },
      });

      const { result } = renderHook(() => useManageRolesData('user', 'existing-user'));

      const roleNames = result.current.rows.map((r) => r.roleRef.name);
      // Should include reversible role (admin) AND the assigned custom role
      expect(roleNames).toContain('admin');
      expect(roleNames).toContain('custom-cluster-role');
    });

    it('should NOT include unassigned custom roles for existing subjects', () => {
      const user = mockUserRoleBindingSubject({ name: 'existing-user' });
      const roleBindings: RoleBindingKind[] = [
        mockRoleBindingK8sResource({
          name: 'rb-admin',
          namespace,
          roleRefKind: 'ClusterRole',
          roleRefName: 'admin',
          subjects: [user],
        }),
      ];
      const clusterRoles: ClusterRoleKind[] = [
        mockClusterRoleK8sResource({
          name: 'admin',
          labels: { 'kubernetes.io/bootstrapping': 'rbac-defaults' },
        }),
        mockClusterRoleK8sResource({
          name: 'unassigned-custom-role',
          labels: {}, // Explicitly no dashboard label, so it's a custom role
        }),
      ];

      mockUsePermissionsContext.mockReturnValue({
        roles: { data: [] },
        clusterRoles: { data: clusterRoles },
        roleBindings: { data: roleBindings },
      });

      const { result } = renderHook(() => useManageRolesData('user', 'existing-user'));

      const roleNames = result.current.rows.map((r) => r.roleRef.name);
      // Should include default roles (admin, edit) but NOT the unassigned custom role
      expect(roleNames).toContain('admin');
      expect(roleNames).toContain('edit');
      expect(roleNames).not.toContain('unassigned-custom-role');
    });

    it('should pre-select assigned roles for existing subjects', () => {
      const user = mockUserRoleBindingSubject({ name: 'existing-user' });
      const roleBindings: RoleBindingKind[] = [
        mockRoleBindingK8sResource({
          name: 'rb-admin',
          namespace,
          roleRefKind: 'ClusterRole',
          roleRefName: 'admin',
          subjects: [user],
        }),
      ];
      const clusterRoles: ClusterRoleKind[] = [
        mockClusterRoleK8sResource({
          name: 'admin',
          labels: { 'kubernetes.io/bootstrapping': 'rbac-defaults' },
        }),
        mockClusterRoleK8sResource({
          name: 'edit',
          labels: { 'kubernetes.io/bootstrapping': 'rbac-defaults' },
        }),
      ];

      mockUsePermissionsContext.mockReturnValue({
        roles: { data: [] },
        clusterRoles: { data: clusterRoles },
        roleBindings: { data: roleBindings },
      });

      const { result } = renderHook(() => useManageRolesData('user', 'existing-user'));

      // Selections should include admin (assigned) but not edit (not assigned)
      const selectionNames = result.current.selections.map((r) => r.name);
      expect(selectionNames).toContain('admin');
      expect(selectionNames).not.toContain('edit');
    });

    it('should have no pre-selected roles for new subjects', () => {
      const clusterRoles: ClusterRoleKind[] = [
        mockClusterRoleK8sResource({
          name: 'admin',
          labels: { 'kubernetes.io/bootstrapping': 'rbac-defaults' },
        }),
      ];

      mockUsePermissionsContext.mockReturnValue({
        roles: { data: [] },
        clusterRoles: { data: clusterRoles },
        roleBindings: { data: [] },
      });

      const { result } = renderHook(() => useManageRolesData('user', 'brand-new-user'));

      expect(result.current.selections).toHaveLength(0);
    });
  });
});
