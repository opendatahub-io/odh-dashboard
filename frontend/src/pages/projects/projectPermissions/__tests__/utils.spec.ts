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

  it('classifies default roleRefs (admin/edit)', () => {
    expect(isDefaultRoleRef(roleRefAdmin)).toBe(true);
    expect(isDefaultRoleRef(roleRefEdit)).toBe(true);
    expect(isDefaultRoleRef({ kind: 'ClusterRole', name: 'view' })).toBe(false);
    expect(isDefaultRoleRef({ kind: 'Role', name: 'custom-role' })).toBe(false);
  });

  it('detects dashboard roles by label type', () => {
    const dashboardRole = mockRoleK8sResource({
      name: 'dashboard-role',
      labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
    });
    const nonDashboardRole = mockRoleK8sResource({
      name: 'custom-role',
      labels: { foo: 'bar' },
    });

    expect(isDashboardRole(dashboardRole)).toBe(true);
    expect(isDashboardRole(nonDashboardRole)).toBe(false);
    expect(isDashboardRole()).toBe(false);
  });

  it('treats default or dashboard roles as AI roles', () => {
    const dashboardRole = mockRoleK8sResource({
      name: 'dashboard-role',
      labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
    });

    expect(isAiRole(roleRefAdmin)).toBe(true);
    expect(isAiRole({ kind: 'Role', name: 'custom-role' }, dashboardRole)).toBe(true);
    expect(isAiRole({ kind: 'Role', name: 'custom-role' })).toBe(false);
  });

  it('builds reversible role refs from defaults and dashboard-labeled roles', () => {
    const dashboardRole = mockRoleK8sResource({
      name: 'dashboard-role',
      labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
    });
    const dashboardClusterRole = mockClusterRoleK8sResource({
      name: 'dashboard-cr',
      labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
    });
    const duplicateDashboardRole = mockRoleK8sResource({
      name: 'dashboard-role',
      labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
    });

    const refs = getReversibleRoleRefs(
      [dashboardRole, duplicateDashboardRole],
      [dashboardClusterRole],
    );
    const keys = refs.map((r) => `${r.kind}:${r.name}`);

    expect(keys).toEqual(
      expect.arrayContaining([
        'ClusterRole:admin',
        'ClusterRole:edit',
        'Role:dashboard-role',
        'ClusterRole:dashboard-cr',
      ]),
    );
    expect(keys.filter((k) => k === 'Role:dashboard-role')).toHaveLength(1);
  });

  it('returns only defaults when no dashboard roles are provided', () => {
    const refs = getReversibleRoleRefs([], []);
    const keys = refs.map((r) => `${r.kind}:${r.name}`);

    expect(keys).toEqual(expect.arrayContaining(['ClusterRole:admin', 'ClusterRole:edit']));
    expect(keys).toHaveLength(2);
  });

  it('builds subject refs for user and group kinds', () => {
    expect(getSubjectRef('user', 'alice')).toEqual({
      kind: RBAC_SUBJECT_KIND_USER,
      name: 'alice',
    });
    expect(getSubjectRef('group', 'team-a')).toEqual({
      kind: RBAC_SUBJECT_KIND_GROUP,
      name: 'team-a',
    });
  });

  it('dedupes roleRefs while preserving the first occurrence', () => {
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

  it('returns assignment status based on assigned and selected roleRefs', () => {
    const assigned = [roleRefAdmin];
    const selected = [roleRefAdmin, roleRefEdit];

    expect(getAssignmentStatus(roleRefAdmin, assigned, selected)).toBe(
      AssignmentStatus.CurrentlyAssigned,
    );
    expect(getAssignmentStatus(roleRefEdit, assigned, selected)).toBe(AssignmentStatus.Assigning);
    expect(getAssignmentStatus(roleRefAdmin, assigned, [])).toBe(AssignmentStatus.Unassigning);
    expect(getAssignmentStatus({ kind: 'Role', name: 'custom' }, assigned, selected)).toBe('');
  });
});
