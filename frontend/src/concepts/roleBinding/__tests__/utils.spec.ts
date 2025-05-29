import { mockRoleBindingK8sResource } from '#~/__mocks__/mockRoleBindingK8sResource';
import {
  castRoleBindingPermissionsRoleType,
  isCurrentUserChanging,
  tryPatchRoleBinding,
} from '#~/concepts/roleBinding/utils';
import { patchRoleBindingSubjects } from '#~/api';
import { RoleBindingPermissionsRoleType } from '#~/concepts/roleBinding/types';

// Mock the patchRoleBindingSubjects function
jest.mock('#~/api', () => ({
  patchRoleBindingSubjects: jest.fn(),
}));

describe('isCurrentUserChanging', () => {
  it('should return true when role binding subject matches current username', () => {
    const roleBinding = mockRoleBindingK8sResource({
      name: 'test-user',
      subjects: [{ kind: 'User', apiGroup: 'rbac.authorization.k8s.io', name: 'test-user' }],
    });
    expect(isCurrentUserChanging(roleBinding, 'test-user')).toBe(true);
  });

  it('should return false when role binding subject does not match current username', () => {
    const roleBinding = mockRoleBindingK8sResource({
      name: 'other-user',
      subjects: [{ kind: 'User', apiGroup: 'rbac.authorization.k8s.io', name: 'other-user' }],
    });
    expect(isCurrentUserChanging(roleBinding, 'test-user')).toBe(false);
  });

  it('should return false when role binding is undefined', () => {
    expect(isCurrentUserChanging(undefined, 'test-user')).toBe(false);
  });
});

describe('tryPatchRoleBinding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when roleRef is different', async () => {
    const oldRBObject = mockRoleBindingK8sResource({
      name: 'test-user',
      subjects: [{ kind: 'User', apiGroup: 'rbac.authorization.k8s.io', name: 'test-user' }],
      roleRefName: 'view',
    });
    const newRBObject = mockRoleBindingK8sResource({
      name: 'test-user',
      subjects: [{ kind: 'User', apiGroup: 'rbac.authorization.k8s.io', name: 'test-user' }],
      roleRefName: 'edit',
    });
    const result = await tryPatchRoleBinding(oldRBObject, newRBObject);
    expect(result).toBe(false);
    expect(patchRoleBindingSubjects).not.toHaveBeenCalled();
  });

  it('should return false when dry run fails', async () => {
    const oldRBObject = mockRoleBindingK8sResource({
      name: 'test-user',
      subjects: [{ kind: 'User', apiGroup: 'rbac.authorization.k8s.io', name: 'old-user' }],
      roleRefName: 'view',
    });
    const newRBObject = mockRoleBindingK8sResource({
      name: 'test-user',
      subjects: [{ kind: 'User', apiGroup: 'rbac.authorization.k8s.io', name: 'new-user' }],
      roleRefName: 'view',
    });

    // Mock the dry run to fail
    (patchRoleBindingSubjects as jest.Mock).mockRejectedValueOnce(new Error('Dry run failed'));

    const result = await tryPatchRoleBinding(oldRBObject, newRBObject);
    expect(result).toBe(false);
    expect(patchRoleBindingSubjects).toHaveBeenCalledTimes(1);
    expect(patchRoleBindingSubjects).toHaveBeenCalledWith(
      oldRBObject.metadata.name,
      oldRBObject.metadata.namespace,
      newRBObject.subjects,
      { dryRun: true },
    );
  });

  it('should return true when both dry run and patch succeed', async () => {
    const oldRBObject = mockRoleBindingK8sResource({
      name: 'test-user',
      subjects: [{ kind: 'User', name: 'old-user' }],
      roleRefName: 'view',
    });
    const newRBObject = mockRoleBindingK8sResource({
      name: 'test-user',
      subjects: [{ kind: 'User', name: 'new-user' }],
      roleRefName: 'view',
    });

    // Mock both calls to succeed
    (patchRoleBindingSubjects as jest.Mock)
      .mockResolvedValueOnce(undefined) // dry run succeeds
      .mockResolvedValueOnce(undefined); // actual patch succeeds

    const result = await tryPatchRoleBinding(oldRBObject, newRBObject);
    expect(result).toBe(true);
    expect(patchRoleBindingSubjects).toHaveBeenCalledTimes(2);
    expect(patchRoleBindingSubjects).toHaveBeenNthCalledWith(
      1,
      oldRBObject.metadata.name,
      oldRBObject.metadata.namespace,
      newRBObject.subjects,
      { dryRun: true },
    );
    expect(patchRoleBindingSubjects).toHaveBeenNthCalledWith(
      2,
      oldRBObject.metadata.name,
      oldRBObject.metadata.namespace,
      newRBObject.subjects,
      { dryRun: false },
    );
  });
});

describe('castRoleBindingPermissionsRoleType', () => {
  it('should return default when role includes registry-user', () => {
    expect(castRoleBindingPermissionsRoleType('registry-user')).toBe(
      RoleBindingPermissionsRoleType.DEFAULT,
    );
  });

  it('should return admin when role is admin', () => {
    expect(castRoleBindingPermissionsRoleType('admin')).toBe(RoleBindingPermissionsRoleType.ADMIN);
  });

  it('should return edit when role is edit', () => {
    expect(castRoleBindingPermissionsRoleType('edit')).toBe(RoleBindingPermissionsRoleType.EDIT);
  });

  it('should return custom when role is not admin, edit, or registry-user', () => {
    expect(castRoleBindingPermissionsRoleType('custom')).toBe(
      RoleBindingPermissionsRoleType.CUSTOM,
    );
  });
});
