import type { RoleRef } from '#~/concepts/permissions/types';
import {
  isDefaultRoleRef,
  isDashboardRole,
  isAiRole,
  getReversibleRoleRefs,
  getSubjectRef,
  dedupeRoleRefs,
  getAssignmentStatus,
} from '#~/pages/projects/projectPermissions/utils';
import { mockRoleK8sResource, mockClusterRoleK8sResource } from '#~/__mocks__';
import { KnownLabels } from '#~/k8sTypes';
import { RBAC_SUBJECT_KIND_GROUP, RBAC_SUBJECT_KIND_USER } from '#~/concepts/permissions/const';
import { AssignmentStatus } from '#~/pages/projects/projectPermissions/types';

describe('project permissions utils', () => {
  const roleRefAdmin: RoleRef = { kind: 'ClusterRole', name: 'admin' };
  const roleRefEdit: RoleRef = { kind: 'ClusterRole', name: 'edit' };

  describe('isDefaultRoleRef', () => {
    it('should return true for admin roleRef', () => {
      expect(isDefaultRoleRef(roleRefAdmin)).toBe(true);
    });

    it('should return true for edit roleRef', () => {
      expect(isDefaultRoleRef(roleRefEdit)).toBe(true);
    });

    it('should return false for non-default ClusterRole', () => {
      expect(isDefaultRoleRef({ kind: 'ClusterRole', name: 'view' })).toBe(false);
    });

    it('should return false for custom Role', () => {
      expect(isDefaultRoleRef({ kind: 'Role', name: 'custom-role' })).toBe(false);
    });
  });

  describe('isDashboardRole', () => {
    it('should return true for roles with dashboard label', () => {
      const dashboardRole = mockRoleK8sResource({
        name: 'dashboard-role',
        labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
      });
      expect(isDashboardRole(dashboardRole)).toBe(true);
    });

    it('should return false for roles without dashboard label', () => {
      const nonDashboardRole = mockRoleK8sResource({
        name: 'custom-role',
        labels: { foo: 'bar' },
      });
      expect(isDashboardRole(nonDashboardRole)).toBe(false);
    });

    it('should return false for undefined role', () => {
      expect(isDashboardRole()).toBe(false);
    });
  });

  describe('isAiRole', () => {
    it('should return true for default roleRefs', () => {
      expect(isAiRole(roleRefAdmin)).toBe(true);
    });

    it('should return true for dashboard-labeled roles', () => {
      const dashboardRole = mockRoleK8sResource({
        name: 'dashboard-role',
        labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
      });
      expect(isAiRole({ kind: 'Role', name: 'custom-role' }, dashboardRole)).toBe(true);
    });

    it('should return false for custom roles without dashboard label', () => {
      expect(isAiRole({ kind: 'Role', name: 'custom-role' })).toBe(false);
    });
  });

  describe('getReversibleRoleRefs', () => {
    it('should include defaults and dashboard-labeled roles', () => {
      const dashboardRole = mockRoleK8sResource({
        name: 'dashboard-role',
        labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
      });
      const dashboardClusterRole = mockClusterRoleK8sResource({
        name: 'dashboard-cr',
        labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
      });

      const refs = getReversibleRoleRefs([dashboardRole], [dashboardClusterRole]);
      const keys = refs.map((r) => `${r.kind}:${r.name}`);

      expect(keys).toEqual(
        expect.arrayContaining([
          'ClusterRole:admin',
          'ClusterRole:edit',
          'Role:dashboard-role',
          'ClusterRole:dashboard-cr',
        ]),
      );
    });

    it('should deduplicate roleRefs with same kind and name', () => {
      const dashboardRole = mockRoleK8sResource({
        name: 'dashboard-role',
        labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
      });
      const duplicateDashboardRole = mockRoleK8sResource({
        name: 'dashboard-role',
        labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
      });

      const refs = getReversibleRoleRefs([dashboardRole, duplicateDashboardRole], []);
      const keys = refs.map((r) => `${r.kind}:${r.name}`);

      expect(keys.filter((k) => k === 'Role:dashboard-role')).toHaveLength(1);
    });

    it('should return only defaults when no dashboard roles are provided', () => {
      const refs = getReversibleRoleRefs([], []);
      const keys = refs.map((r) => `${r.kind}:${r.name}`);

      expect(keys).toEqual(expect.arrayContaining(['ClusterRole:admin', 'ClusterRole:edit']));
      expect(keys).toHaveLength(2);
    });
  });

  describe('getSubjectRef', () => {
    it('should build user subject ref', () => {
      expect(getSubjectRef('user', 'alice')).toEqual({
        kind: RBAC_SUBJECT_KIND_USER,
        name: 'alice',
      });
    });

    it('should build group subject ref', () => {
      expect(getSubjectRef('group', 'team-a')).toEqual({
        kind: RBAC_SUBJECT_KIND_GROUP,
        name: 'team-a',
      });
    });
  });

  describe('dedupeRoleRefs', () => {
    it('should dedupe roleRefs while preserving the first occurrence', () => {
      const refs: RoleRef[] = [
        { kind: 'Role', name: 'a' },
        { kind: 'Role', name: 'a' },
        { kind: 'ClusterRole', name: 'a' },
        { kind: 'Role', name: 'b' },
        { kind: 'Role', name: 'b' },
      ];

      expect(dedupeRoleRefs(refs)).toEqual([
        { kind: 'Role', name: 'a' },
        { kind: 'ClusterRole', name: 'a' },
        { kind: 'Role', name: 'b' },
      ]);
    });

    it('should return empty array for empty input', () => {
      expect(dedupeRoleRefs([])).toEqual([]);
    });
  });

  describe('getAssignmentStatus', () => {
    it('should return CurrentlyAssigned for assigned and selected roles', () => {
      const assigned = [roleRefAdmin];
      const selected = [roleRefAdmin, roleRefEdit];
      expect(getAssignmentStatus(roleRefAdmin, assigned, selected)).toBe(
        AssignmentStatus.CurrentlyAssigned,
      );
    });

    it('should return Assigning for newly selected roles', () => {
      const assigned = [roleRefAdmin];
      const selected = [roleRefAdmin, roleRefEdit];
      expect(getAssignmentStatus(roleRefEdit, assigned, selected)).toBe(AssignmentStatus.Assigning);
    });

    it('should return Unassigning for deselected roles', () => {
      const assigned = [roleRefAdmin];
      expect(getAssignmentStatus(roleRefAdmin, assigned, [])).toBe(AssignmentStatus.Unassigning);
    });

    it('should return undefined for roles neither assigned nor selected', () => {
      const assigned = [roleRefAdmin];
      const selected = [roleRefAdmin, roleRefEdit];
      expect(
        getAssignmentStatus({ kind: 'Role', name: 'custom' }, assigned, selected),
      ).toBeUndefined();
    });
  });
});
