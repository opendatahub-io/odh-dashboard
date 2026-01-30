import { mockRoleBindingK8sResource } from '#~/__mocks__/mockRoleBindingK8sResource';
import {
  castRoleBindingPermissionsRoleType,
  filterRoleBindingSubjects,
  firstSubject,
  isCurrentUserChanging,
  removePrefix,
  tryPatchRoleBinding,
} from '#~/concepts/roleBinding/utils';
import { patchRoleBindingSubjects } from '#~/api';
import {
  RoleBindingPermissionsRBType,
  RoleBindingPermissionsRoleType,
} from '#~/concepts/roleBinding/types';
import { RoleBindingKind } from '#~/k8sTypes';

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

describe('handling RoleBindings with undefined subjects', () => {
  /**
   * Per the Kubernetes API spec, the 'subjects' field in a RoleBinding is optional.
   * Only 'roleRef' is required. Some system namespaces (like istio-system) may have
   * RoleBindings without subjects, so all utility functions must handle this gracefully.
   */

  const createRoleBindingWithoutSubjects = (): RoleBindingKind => ({
    kind: 'RoleBinding',
    apiVersion: 'rbac.authorization.k8s.io/v1',
    metadata: {
      name: 'test-rolebinding-no-subjects',
      namespace: 'istio-system',
      uid: 'test-uid',
      creationTimestamp: '2023-02-14T21:43:59Z',
    },
    // subjects is intentionally omitted - valid per K8s API spec
    roleRef: {
      apiGroup: 'rbac.authorization.k8s.io',
      kind: 'ClusterRole',
      name: 'view',
    },
  });

  describe('filterRoleBindingSubjects', () => {
    it('should filter out RoleBindings with undefined subjects', () => {
      const roleBindings = [
        mockRoleBindingK8sResource({
          name: 'valid-user',
          subjects: [{ kind: 'User', apiGroup: 'rbac.authorization.k8s.io', name: 'valid-user' }],
        }),
        createRoleBindingWithoutSubjects(),
      ];

      const result = filterRoleBindingSubjects(roleBindings, RoleBindingPermissionsRBType.USER);
      expect(result).toHaveLength(1);
      expect(result[0].metadata.name).toBe('valid-user');
    });

    it('should return empty array when all RoleBindings have undefined subjects', () => {
      const roleBindings = [createRoleBindingWithoutSubjects()];

      const result = filterRoleBindingSubjects(roleBindings, RoleBindingPermissionsRBType.USER);
      expect(result).toHaveLength(0);
    });
  });

  describe('firstSubject', () => {
    it('should return empty string when subjects is undefined', () => {
      const roleBinding = createRoleBindingWithoutSubjects();
      expect(firstSubject(roleBinding)).toBe('');
    });

    it('should return empty string when subjects is undefined with project context', () => {
      const roleBinding = createRoleBindingWithoutSubjects();
      expect(firstSubject(roleBinding, true, [])).toBe('');
    });
  });

  describe('removePrefix', () => {
    it('should filter out undefined names from RoleBindings without subjects', () => {
      const roleBindings = [
        mockRoleBindingK8sResource({
          name: 'valid-sa',
          subjects: [
            {
              kind: 'ServiceAccount',
              apiGroup: 'rbac.authorization.k8s.io',
              name: 'system:serviceaccounts:test-namespace',
            },
          ],
        }),
        createRoleBindingWithoutSubjects(),
      ];

      const result = removePrefix(roleBindings);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('test-namespace');
    });

    it('should return empty array when all RoleBindings have undefined subjects', () => {
      const roleBindings = [createRoleBindingWithoutSubjects()];

      const result = removePrefix(roleBindings);
      expect(result).toHaveLength(0);
    });
  });

  describe('isCurrentUserChanging', () => {
    it('should return false when subjects is undefined', () => {
      const roleBinding = createRoleBindingWithoutSubjects();
      expect(isCurrentUserChanging(roleBinding, 'any-user')).toBe(false);
    });
  });

  describe('tryPatchRoleBinding', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should pass empty array when newRBObject has undefined subjects', async () => {
      const oldRBObject = mockRoleBindingK8sResource({
        name: 'test-rb',
        subjects: [{ kind: 'User', name: 'old-user' }],
        roleRefName: 'view',
      });
      const newRBObject = createRoleBindingWithoutSubjects();
      // Make roleRef match so patch is attempted
      newRBObject.roleRef.name = 'view';

      (patchRoleBindingSubjects as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      const result = await tryPatchRoleBinding(oldRBObject, newRBObject);
      expect(result).toBe(true);
      expect(patchRoleBindingSubjects).toHaveBeenCalledWith(
        oldRBObject.metadata.name,
        oldRBObject.metadata.namespace,
        [], // subjects should be an empty array when undefined
        { dryRun: true },
      );
    });
  });
});
