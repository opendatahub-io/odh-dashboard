import { act, renderHook } from '@testing-library/react';
import { mockRoleBindingK8sResource, mockUserRoleBindingSubject } from '#~/__mocks__';
import type { RoleBindingKind } from '#~/k8sTypes';
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
    mockUsePermissionsContext.mockReset();
  });

  it('returns no changes when subject name is empty', () => {
    mockUsePermissionsContext.mockReturnValue({
      roles: { data: [] },
      clusterRoles: { data: [] },
      roleBindings: { data: [] },
    });

    const { result } = renderHook(() => useManageRolesData('user', '  ', []));

    expect(result.current.trimmedSubjectName).toBe('');
    expect(result.current.hasChanges).toBe(false);
    expect(result.current.changes).toEqual({
      assigning: [],
      unassigning: [],
    });
  });

  it('marks assigning when a new subject selects a role', () => {
    mockUsePermissionsContext.mockReturnValue({
      roles: { data: [] },
      clusterRoles: { data: [] },
      roleBindings: { data: [] },
    });

    const { result } = renderHook(() => useManageRolesData('user', 'alice', []));

    act(() => {
      result.current.toggleSelection(roleRefAdmin);
    });

    expect(result.current.hasChanges).toBe(true);
    expect(result.current.changes.assigning).toHaveLength(1);
    expect(result.current.changes.assigning[0].roleRef).toEqual(roleRefAdmin);
    expect(result.current.changes.unassigning).toHaveLength(0);
  });

  it('marks unassigning custom roles for existing subjects', () => {
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

    const { result } = renderHook(() => useManageRolesData('user', 'bob', ['bob']));

    act(() => {
      result.current.toggleSelection(roleRefCustom);
    });
    expect(result.current.hasChanges).toBe(true);
    expect(result.current.changes.unassigning).toHaveLength(1);
    expect(result.current.changes.unassigning[0].roleRef).toEqual(roleRefCustom);
  });
});
