import {
  mock200Status,
  mockRoleBindingK8sResource,
  mockUserRoleBindingSubject,
} from '#~/__mocks__';
import type { RoleRef } from '#~/concepts/permissions/types';
import type { RoleBindingKind, RoleBindingSubject } from '#~/k8sTypes';
import {
  upsertRoleBinding,
  findRoleBindingForRoleRef,
  findAllRoleBindingsForSubjectAndRoleRef,
  removeSubjectFromRoleBinding,
  applyRoleAssignmentChanges,
} from '#~/pages/projects/projectPermissions/roleBindingMutations';
import type { RoleAssignmentChanges } from '#~/pages/projects/projectPermissions/manageRoles/types';
import type { ManageRolesRow } from '#~/pages/projects/projectPermissions/manageRoles/columns';
import { AssignmentStatus } from '#~/pages/projects/projectPermissions/types';

jest.mock('#~/api', () => ({
  createRoleBinding: jest.fn(),
  deleteRoleBinding: jest.fn(),
  generateRoleBindingPermissions: jest.fn(),
  patchRoleBindingSubjects: jest.fn(),
}));

import {
  createRoleBinding,
  deleteRoleBinding,
  generateRoleBindingPermissions,
  patchRoleBindingSubjects,
} from '#~/api';

const createRoleBindingMock = jest.mocked(createRoleBinding);
const deleteRoleBindingMock = jest.mocked(deleteRoleBinding);
const generateRoleBindingPermissionsMock = jest.mocked(generateRoleBindingPermissions);
const patchRoleBindingSubjectsMock = jest.mocked(patchRoleBindingSubjects);

describe('project permissions roleBindingMutations', () => {
  const namespace = 'test-ns';
  const subject: RoleBindingSubject = mockUserRoleBindingSubject({ name: 'test-user-1' });

  const roleRefEdit: RoleRef = { kind: 'ClusterRole', name: 'edit' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findRoleBindingForRoleRef', () => {
    it('should return the first RoleBinding matching namespace + roleRef', () => {
      const rbs: RoleBindingKind[] = [
        mockRoleBindingK8sResource({
          name: 'rb-other-ns',
          namespace: 'other-ns',
          roleRefKind: 'ClusterRole',
          roleRefName: 'edit',
          subjects: [subject],
        }),
        mockRoleBindingK8sResource({
          name: 'rb-match-1',
          namespace,
          roleRefKind: 'ClusterRole',
          roleRefName: 'edit',
          subjects: [],
        }),
        mockRoleBindingK8sResource({
          name: 'rb-match-2',
          namespace,
          roleRefKind: 'ClusterRole',
          roleRefName: 'edit',
          subjects: [],
        }),
      ];

      const found = findRoleBindingForRoleRef({
        roleBindings: rbs,
        namespace,
        roleRef: roleRefEdit,
      });
      expect(found?.metadata.name).toBe('rb-match-1');
    });
  });

  describe('findAllRoleBindingsForSubjectAndRoleRef', () => {
    it('should return all RoleBindings matching namespace, roleRef, and containing subject', () => {
      const rbs: RoleBindingKind[] = [
        mockRoleBindingK8sResource({
          name: 'rb-match-1',
          namespace,
          roleRefKind: 'ClusterRole',
          roleRefName: 'edit',
          subjects: [subject],
        }),
        mockRoleBindingK8sResource({
          name: 'rb-match-2',
          namespace,
          roleRefKind: 'ClusterRole',
          roleRefName: 'edit',
          subjects: [subject],
        }),
        mockRoleBindingK8sResource({
          name: 'rb-no-subject',
          namespace,
          roleRefKind: 'ClusterRole',
          roleRefName: 'edit',
          subjects: [],
        }),
        mockRoleBindingK8sResource({
          name: 'rb-other-role',
          namespace,
          roleRefKind: 'ClusterRole',
          roleRefName: 'admin',
          subjects: [subject],
        }),
      ];

      const found = findAllRoleBindingsForSubjectAndRoleRef({
        roleBindings: rbs,
        namespace,
        roleRef: roleRefEdit,
        subject,
      });
      expect(found).toHaveLength(2);
      expect(found.map((rb) => rb.metadata.name)).toEqual(['rb-match-1', 'rb-match-2']);
    });

    it('should return empty array when no matches', () => {
      const found = findAllRoleBindingsForSubjectAndRoleRef({
        roleBindings: [],
        namespace,
        roleRef: roleRefEdit,
        subject,
      });
      expect(found).toHaveLength(0);
    });
  });

  describe('upsertRoleBinding', () => {
    it('should create a RoleBinding when none match', async () => {
      const generated: RoleBindingKind = mockRoleBindingK8sResource({
        name: 'generated',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'edit',
        subjects: [subject],
      });
      generateRoleBindingPermissionsMock.mockReturnValue(generated);

      await upsertRoleBinding({
        roleBindings: [],
        namespace,
        subjectKind: 'User',
        subject,
        roleRef: roleRefEdit,
      });

      expect(generateRoleBindingPermissionsMock).toHaveBeenCalledTimes(1);
      expect(createRoleBindingMock).toHaveBeenCalledTimes(1);
      expect(createRoleBindingMock).toHaveBeenCalledWith(generated);
      expect(patchRoleBindingSubjectsMock).not.toHaveBeenCalled();
    });

    it('should patch the first matching RoleBinding when subject is not already assigned', async () => {
      const rb1 = mockRoleBindingK8sResource({
        name: 'rb-1',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'edit',
        subjects: [],
      });
      const rb2 = mockRoleBindingK8sResource({
        name: 'rb-2',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'edit',
        subjects: [],
      });

      await upsertRoleBinding({
        roleBindings: [rb1, rb2],
        namespace,
        subjectKind: 'User',
        subject,
        roleRef: roleRefEdit,
      });

      expect(createRoleBindingMock).not.toHaveBeenCalled();
      expect(patchRoleBindingSubjectsMock).toHaveBeenCalledTimes(1);
      expect(patchRoleBindingSubjectsMock).toHaveBeenCalledWith('rb-1', namespace, [subject]);
    });

    it('should do nothing when the subject is already assigned via any matching RoleBinding', async () => {
      const rb1 = mockRoleBindingK8sResource({
        name: 'rb-1',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'edit',
        subjects: [],
      });
      const rb2 = mockRoleBindingK8sResource({
        name: 'rb-2',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'edit',
        subjects: [subject],
      });

      await upsertRoleBinding({
        roleBindings: [rb1, rb2],
        namespace,
        subjectKind: 'User',
        subject,
        roleRef: roleRefEdit,
      });

      expect(createRoleBindingMock).not.toHaveBeenCalled();
      expect(patchRoleBindingSubjectsMock).not.toHaveBeenCalled();
    });
  });

  describe('removeSubjectFromRoleBinding', () => {
    it('should no-op when the subject is not present', async () => {
      const rb = mockRoleBindingK8sResource({
        name: 'rb-1',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'edit',
        subjects: [],
      });

      await removeSubjectFromRoleBinding({ namespace, roleBinding: rb, subject });

      expect(deleteRoleBindingMock).not.toHaveBeenCalled();
      expect(patchRoleBindingSubjectsMock).not.toHaveBeenCalled();
    });

    it('should delete the RoleBinding when removing the last subject', async () => {
      const rb = mockRoleBindingK8sResource({
        name: 'rb-1',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'edit',
        subjects: [subject],
      });

      await removeSubjectFromRoleBinding({ namespace, roleBinding: rb, subject });

      expect(deleteRoleBindingMock).toHaveBeenCalledTimes(1);
      expect(deleteRoleBindingMock).toHaveBeenCalledWith('rb-1', namespace);
      expect(patchRoleBindingSubjectsMock).not.toHaveBeenCalled();
    });

    it('should patch remaining subjects when RoleBinding still has other subjects', async () => {
      const other = mockUserRoleBindingSubject({ name: 'test-user-2' });
      const rb = mockRoleBindingK8sResource({
        name: 'rb-1',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'edit',
        subjects: [subject, other],
      });

      await removeSubjectFromRoleBinding({ namespace, roleBinding: rb, subject });

      expect(deleteRoleBindingMock).not.toHaveBeenCalled();
      expect(patchRoleBindingSubjectsMock).toHaveBeenCalledTimes(1);
      expect(patchRoleBindingSubjectsMock).toHaveBeenCalledWith('rb-1', namespace, [other]);
    });
  });

  describe('applyRoleAssignmentChanges', () => {
    const roleRefAdmin: RoleRef = { kind: 'ClusterRole', name: 'admin' };
    const roleRefCustom: RoleRef = { kind: 'Role', name: 'custom-role' };

    const createRow = (roleRef: RoleRef): ManageRolesRow => ({
      roleRef,
      displayName: roleRef.name,
      statusLabel: AssignmentStatus.CurrentlyAssigned,
      role: undefined,
    });

    it('should apply all assignments and unassignments in parallel and return success', async () => {
      const rbAdmin = mockRoleBindingK8sResource({
        name: 'rb-admin',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'admin',
        subjects: [subject],
      });
      const rbCustom = mockRoleBindingK8sResource({
        name: 'rb-custom',
        namespace,
        roleRefKind: 'Role',
        roleRefName: 'custom-role',
        subjects: [subject],
      });

      const generated: RoleBindingKind = mockRoleBindingK8sResource({
        name: 'generated',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'edit',
        subjects: [subject],
      });
      generateRoleBindingPermissionsMock.mockReturnValue(generated);

      const changes: RoleAssignmentChanges = {
        assigning: [createRow(roleRefEdit)],
        unassigning: [createRow(roleRefAdmin), createRow(roleRefCustom)],
      };

      const result = await applyRoleAssignmentChanges({
        roleBindings: [rbAdmin, rbCustom],
        namespace,
        subjectKind: 'User',
        subjectName: 'test-user-1',
        changes,
      });

      // Assigning should create a new RoleBinding (no existing for edit)
      expect(generateRoleBindingPermissionsMock).toHaveBeenCalledTimes(1);
      expect(createRoleBindingMock).toHaveBeenCalledTimes(1);

      // Unassigning should delete both (last subject)
      expect(deleteRoleBindingMock).toHaveBeenCalledTimes(2);
      expect(deleteRoleBindingMock).toHaveBeenCalledWith('rb-admin', namespace);
      expect(deleteRoleBindingMock).toHaveBeenCalledWith('rb-custom', namespace);

      // Verify result
      expect(result.success).toBe(true);
      expect(result.totalOperations).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty changes gracefully', async () => {
      const changes: RoleAssignmentChanges = {
        assigning: [],
        unassigning: [],
      };

      const result = await applyRoleAssignmentChanges({
        roleBindings: [],
        namespace,
        subjectKind: 'User',
        subjectName: 'test-user-1',
        changes,
      });

      expect(createRoleBindingMock).not.toHaveBeenCalled();
      expect(deleteRoleBindingMock).not.toHaveBeenCalled();
      expect(patchRoleBindingSubjectsMock).not.toHaveBeenCalled();

      expect(result.success).toBe(true);
      expect(result.totalOperations).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });

    it('should skip unassignment when no RoleBinding is found for roleRef', async () => {
      const changes: RoleAssignmentChanges = {
        assigning: [],
        unassigning: [createRow(roleRefAdmin)],
      };

      const result = await applyRoleAssignmentChanges({
        roleBindings: [],
        namespace,
        subjectKind: 'User',
        subjectName: 'test-user-1',
        changes,
      });

      expect(deleteRoleBindingMock).not.toHaveBeenCalled();
      expect(patchRoleBindingSubjectsMock).not.toHaveBeenCalled();

      // No matching RoleBindings means no operations
      expect(result.success).toBe(true);
      expect(result.totalOperations).toBe(0);
      expect(result.successCount).toBe(0);
    });

    it('should remove subject from ALL duplicate RoleBindings for the same roleRef', async () => {
      // Simulate duplicate RoleBindings granting the same role to the same user
      const rbAdmin1 = mockRoleBindingK8sResource({
        name: 'rb-admin-1',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'admin',
        subjects: [subject],
      });
      const rbAdmin2 = mockRoleBindingK8sResource({
        name: 'rb-admin-2',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'admin',
        subjects: [subject],
      });

      const changes: RoleAssignmentChanges = {
        assigning: [],
        unassigning: [createRow(roleRefAdmin)],
      };

      const result = await applyRoleAssignmentChanges({
        roleBindings: [rbAdmin1, rbAdmin2],
        namespace,
        subjectKind: 'User',
        subjectName: 'test-user-1',
        changes,
      });

      // Should delete BOTH RoleBindings (each had only the one subject)
      expect(deleteRoleBindingMock).toHaveBeenCalledTimes(2);
      expect(deleteRoleBindingMock).toHaveBeenCalledWith('rb-admin-1', namespace);
      expect(deleteRoleBindingMock).toHaveBeenCalledWith('rb-admin-2', namespace);

      expect(result.success).toBe(true);
      expect(result.totalOperations).toBe(2);
      expect(result.successCount).toBe(2);
    });

    it('should return failure result when an API call fails', async () => {
      const rb = mockRoleBindingK8sResource({
        name: 'rb-admin',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'admin',
        subjects: [subject],
      });

      deleteRoleBindingMock.mockRejectedValueOnce(new Error('Network error'));

      const changes: RoleAssignmentChanges = {
        assigning: [],
        unassigning: [createRow(roleRefAdmin)],
      };

      const result = await applyRoleAssignmentChanges({
        roleBindings: [rb],
        namespace,
        subjectKind: 'User',
        subjectName: 'test-user-1',
        changes,
      });

      expect(result.success).toBe(false);
      expect(result.totalOperations).toBe(1);
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Network error');
    });

    it('should report partial failure when some operations succeed and some fail', async () => {
      const rbAdmin = mockRoleBindingK8sResource({
        name: 'rb-admin',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'admin',
        subjects: [subject],
      });
      const rbCustom = mockRoleBindingK8sResource({
        name: 'rb-custom',
        namespace,
        roleRefKind: 'Role',
        roleRefName: 'custom-role',
        subjects: [subject],
      });

      // First delete succeeds, second fails
      deleteRoleBindingMock.mockResolvedValueOnce(mock200Status({}));
      deleteRoleBindingMock.mockRejectedValueOnce(new Error('Permission denied'));

      const changes: RoleAssignmentChanges = {
        assigning: [],
        unassigning: [createRow(roleRefAdmin), createRow(roleRefCustom)],
      };

      const result = await applyRoleAssignmentChanges({
        roleBindings: [rbAdmin, rbCustom],
        namespace,
        subjectKind: 'User',
        subjectName: 'test-user-1',
        changes,
      });

      expect(result.success).toBe(false);
      expect(result.totalOperations).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.errors[0].message).toBe('Permission denied');
    });

    it('should work with Group subject kind', async () => {
      const groupSubject: RoleBindingSubject = {
        kind: 'Group',
        apiGroup: 'rbac.authorization.k8s.io',
        name: 'test-group',
      };
      const rbAdmin = mockRoleBindingK8sResource({
        name: 'rb-admin',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'admin',
        subjects: [groupSubject],
      });

      const changes: RoleAssignmentChanges = {
        assigning: [],
        unassigning: [createRow(roleRefAdmin)],
      };

      const result = await applyRoleAssignmentChanges({
        roleBindings: [rbAdmin],
        namespace,
        subjectKind: 'Group',
        subjectName: 'test-group',
        changes,
      });

      expect(deleteRoleBindingMock).toHaveBeenCalledTimes(1);
      expect(deleteRoleBindingMock).toHaveBeenCalledWith('rb-admin', namespace);
      expect(result.success).toBe(true);
    });
  });
});
