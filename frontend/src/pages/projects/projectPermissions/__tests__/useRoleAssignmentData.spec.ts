import { renderHook } from '@testing-library/react';
import {
  mockGroupRoleBindingSubject,
  mockRoleBindingK8sResource,
  mockServiceAccountRoleBindingSubject,
  mockUserRoleBindingSubject,
} from '#~/__mocks__';
import type { RoleBindingKind } from '#~/k8sTypes';
import { useRoleAssignmentData } from '#~/pages/projects/projectPermissions/useRoleAssignmentData';

const mockUsePermissionsContext = jest.fn();

jest.mock('#~/concepts/permissions/PermissionsContext', () => ({
  usePermissionsContext: () => mockUsePermissionsContext(),
}));

describe('useRoleAssignmentData', () => {
  const namespace = 'test-ns';

  beforeEach(() => {
    mockUsePermissionsContext.mockReset();
  });

  it('returns sorted subject names and deduped roleRefs for users', () => {
    const userA = mockUserRoleBindingSubject({ name: 'test-user-a' });
    const userB = mockUserRoleBindingSubject({ name: 'test-user-b' });

    const roleBindings: RoleBindingKind[] = [
      mockRoleBindingK8sResource({
        name: 'rb-a-1',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'edit',
        subjects: [userB],
      }),
      // duplicate roleRef for same user should be deduped
      mockRoleBindingK8sResource({
        name: 'rb-a-2',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'edit',
        subjects: [userB],
      }),
      mockRoleBindingK8sResource({
        name: 'rb-b',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'admin',
        subjects: [userA],
      }),
    ];

    mockUsePermissionsContext.mockReturnValue({ roleBindings: { data: roleBindings } });

    const { result } = renderHook(() => useRoleAssignmentData('user'));

    expect(result.current.existingSubjectNames).toEqual(['test-user-a', 'test-user-b']);
    expect(result.current.assignedRolesBySubject.get('test-user-a')).toEqual([
      { kind: 'ClusterRole', name: 'admin' },
    ]);
    // deduped
    expect(result.current.assignedRolesBySubject.get('test-user-b')).toEqual([
      { kind: 'ClusterRole', name: 'edit' },
    ]);
  });

  it('returns group data when subjectKind is group', () => {
    const groupA = mockGroupRoleBindingSubject({ name: 'test-group-a' });
    const userA = mockUserRoleBindingSubject({ name: 'test-user-a' });

    const roleBindings: RoleBindingKind[] = [
      mockRoleBindingK8sResource({
        name: 'rb-group',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'edit',
        subjects: [groupA, userA],
      }),
    ];

    mockUsePermissionsContext.mockReturnValue({ roleBindings: { data: roleBindings } });

    const { result } = renderHook(() => useRoleAssignmentData('group'));

    expect(result.current.existingSubjectNames).toEqual(['test-group-a']);
    expect(result.current.assignedRolesBySubject.get('test-group-a')).toEqual([
      { kind: 'ClusterRole', name: 'edit' },
    ]);
  });

  it('ignores ServiceAccounts and handles RoleBindings with subjects omitted', () => {
    const userA = mockUserRoleBindingSubject({ name: 'test-user-a' });
    const sa = mockServiceAccountRoleBindingSubject({ name: 'test-sa' });

    const roleBindings: RoleBindingKind[] = [
      mockRoleBindingK8sResource({
        name: 'rb-undefined-subjects',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'edit',
        subjects: undefined,
      }),
      mockRoleBindingK8sResource({
        name: 'rb-mixed',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'edit',
        subjects: [userA, sa],
      }),
    ];

    mockUsePermissionsContext.mockReturnValue({ roleBindings: { data: roleBindings } });

    const { result } = renderHook(() => useRoleAssignmentData('user'));

    expect(result.current.existingSubjectNames).toEqual(['test-user-a']);
    expect(result.current.assignedRolesBySubject.get('test-user-a')).toEqual([
      { kind: 'ClusterRole', name: 'edit' },
    ]);
  });
});
