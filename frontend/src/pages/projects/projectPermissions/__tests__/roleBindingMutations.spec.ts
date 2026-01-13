import { mockRoleBindingK8sResource, mockUserRoleBindingSubject } from '#~/__mocks__';
import type { RoleRef } from '#~/concepts/permissions/types';
import type { RoleBindingKind, RoleBindingSubject } from '#~/k8sTypes';
import {
  upsertRoleBinding,
  findRoleBindingForRoleRef,
  moveSubjectRoleBinding,
  removeSubjectFromRoleBinding,
  roleBindingHasSubject,
} from '#~/pages/projects/projectPermissions/roleBindingMutations';

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
    it('returns the first RoleBinding matching namespace + roleRef', () => {
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

  describe('roleBindingHasSubject', () => {
    it('returns false when subjects is undefined', () => {
      const rb = mockRoleBindingK8sResource({
        name: 'rb-no-subjects',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'edit',
        subjects: undefined,
      });
      expect(roleBindingHasSubject(rb, subject)).toBe(false);
    });
  });

  describe('upsertRoleBinding', () => {
    it('creates a RoleBinding when none match', async () => {
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

    it('patches the first matching RoleBinding when subject is not already assigned', async () => {
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

    it('does nothing when the subject is already assigned via any matching RoleBinding', async () => {
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
    it('no-ops when the subject is not present', async () => {
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

    it('deletes the RoleBinding when removing the last subject', async () => {
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

    it('patches remaining subjects when RoleBinding still has other subjects', async () => {
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

  describe('moveSubjectRoleBinding', () => {
    it('ensures target role and then removes from source role', async () => {
      const fromRb = mockRoleBindingK8sResource({
        name: 'rb-from',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'admin',
        subjects: [subject],
      });

      // Ensure uses patch path: there is an existing RB for edit with empty subjects.
      const existingTo = mockRoleBindingK8sResource({
        name: 'rb-to',
        namespace,
        roleRefKind: 'ClusterRole',
        roleRefName: 'edit',
        subjects: [],
      });

      await moveSubjectRoleBinding({
        roleBindings: [fromRb, existingTo],
        namespace,
        subjectKind: 'User',
        subject,
        fromRoleBinding: fromRb,
        toRoleRef: roleRefEdit,
      });

      // add to target first
      expect(patchRoleBindingSubjectsMock).toHaveBeenCalledWith('rb-to', namespace, [subject]);
      // remove from source (now empty -> delete)
      expect(deleteRoleBindingMock).toHaveBeenCalledWith('rb-from', namespace);
    });
  });
});
