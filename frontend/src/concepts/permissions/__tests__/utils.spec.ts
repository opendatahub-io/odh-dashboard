import {
  buildGroupRoleMap,
  buildUserRoleMap,
  getRoleByRef,
  getRoleLabelTypeForRole,
  getRoleLabelTypeForRoleRef,
  getRoleRefsForSubject,
  getRoleRefKey,
  getRoleAssignmentsForRoleRef,
  getSubjectKey,
  roleBindingHasSubject,
} from '#~/concepts/permissions/utils';
import { RoleLabelType, RoleRef, SupportedSubjectRef } from '#~/concepts/permissions/types';
import { KnownLabels } from '#~/k8sTypes';
import { OPENSHIFT_BOOTSTRAPPING_DEFAULT_VALUE } from '#~/concepts/permissions/const';
import {
  mockClusterRoleK8sResource,
  mockRoleBindingK8sResource,
  mockRoleK8sResource,
  mockGroupRoleBindingSubject,
  mockServiceAccountRoleBindingSubject,
  mockUserRoleBindingSubject,
} from '#~/__mocks__';

describe('permissions utils', () => {
  const namespace = 'test-ns';

  const aliceSubject = mockUserRoleBindingSubject({ name: 'alice' });
  const teamSubject = mockGroupRoleBindingSubject({ name: 'team-a' });
  const serviceAccountSubject = mockServiceAccountRoleBindingSubject({ name: 'sa1' });

  const userAlice: SupportedSubjectRef = { kind: 'User', name: aliceSubject.name };
  const groupTeam: SupportedSubjectRef = { kind: 'Group', name: teamSubject.name };

  const role = mockRoleK8sResource({ name: 'edit', namespace, labels: { foo: 'bar' } });
  const clusterRole = mockClusterRoleK8sResource({ name: 'view', labels: { foo: 'bar' } });

  const roleBindings = [
    mockRoleBindingK8sResource({
      name: 'rb1',
      namespace,
      roleRefKind: 'Role',
      roleRefName: 'edit',
      subjects: [aliceSubject, teamSubject, serviceAccountSubject],
    }),
    mockRoleBindingK8sResource({
      name: 'rb2',
      namespace,
      roleRefKind: 'Role',
      roleRefName: 'edit',
      subjects: [aliceSubject],
    }),
    mockRoleBindingK8sResource({
      name: 'rb3',
      namespace,
      roleRefKind: 'ClusterRole',
      roleRefName: 'view',
      subjects: [teamSubject],
    }),
  ];

  const roleRefEdit: RoleRef = { kind: 'Role', name: role.metadata.name };
  const roleRefView: RoleRef = { kind: 'ClusterRole', name: clusterRole.metadata.name };

  const dashboardRole = mockRoleK8sResource({
    name: 'dashboard-role',
    namespace,
    labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
  });
  const openshiftDefaultRole = mockRoleK8sResource({
    name: 'os-default-role',
    namespace,
    labels: { 'kubernetes.io/bootstrapping': OPENSHIFT_BOOTSTRAPPING_DEFAULT_VALUE },
  });
  const openshiftCustomRole = mockRoleK8sResource({
    name: 'os-custom-role',
    namespace,
    labels: { foo: 'bar' },
  });

  it('creates stable keys for roleRefs and subjects', () => {
    expect(getRoleRefKey(roleRefEdit)).toBe('Role:edit');
    expect(getRoleRefKey(roleRefView)).toBe('ClusterRole:view');
    expect(getSubjectKey(userAlice)).toBe('User:alice');
    expect(getSubjectKey(groupTeam)).toBe('Group:team-a');
  });

  it('classifies role label type', () => {
    expect(getRoleLabelTypeForRole(dashboardRole)).toBe(RoleLabelType.Dashboard);
    expect(getRoleLabelTypeForRole(openshiftDefaultRole)).toBe(RoleLabelType.OpenshiftDefault);
    expect(getRoleLabelTypeForRole(openshiftCustomRole)).toBe(RoleLabelType.OpenshiftCustom);
  });

  it('falls back to OpenShift label type when role object is not readable', () => {
    expect(getRoleLabelTypeForRoleRef({ kind: 'ClusterRole', name: 'admin' })).toBe(
      RoleLabelType.OpenshiftDefault,
    );
    expect(getRoleLabelTypeForRoleRef({ kind: 'ClusterRole', name: 'edit' })).toBe(
      RoleLabelType.OpenshiftDefault,
    );
    expect(getRoleLabelTypeForRoleRef({ kind: 'ClusterRole', name: 'unknown' })).toBe(
      RoleLabelType.OpenshiftCustom,
    );
    expect(getRoleLabelTypeForRoleRef({ kind: 'Role', name: 'unknown' })).toBe(
      RoleLabelType.OpenshiftCustom,
    );
  });

  it('builds user and group role maps', () => {
    const userMap = buildUserRoleMap(roleBindings);
    const groupMap = buildGroupRoleMap(roleBindings);

    expect(userMap.get('alice')).toEqual([roleBindings[0], roleBindings[1]]);
    expect(groupMap.get('team-a')).toEqual([roleBindings[0], roleBindings[2]]);
  });

  it('returns roleRefs for a subject (deduped)', () => {
    expect(getRoleRefsForSubject(roleBindings, userAlice)).toEqual([roleRefEdit]);
    expect(getRoleRefsForSubject(roleBindings, groupTeam)).toEqual([roleRefEdit, roleRefView]);
  });

  it('returns role assignments for a roleRef', () => {
    expect(getRoleAssignmentsForRoleRef(roleBindings, roleRefEdit)).toEqual([
      { subject: aliceSubject, roleBinding: roleBindings[0] },
      { subject: teamSubject, roleBinding: roleBindings[0] },
      { subject: aliceSubject, roleBinding: roleBindings[1] },
    ]);
    expect(getRoleAssignmentsForRoleRef(roleBindings, roleRefView)).toEqual([
      { subject: teamSubject, roleBinding: roleBindings[2] },
    ]);
  });

  it('handles RoleBindings with subjects omitted (valid per k8s spec)', () => {
    const rbNoSubjects = mockRoleBindingK8sResource({
      name: 'rb-no-subjects',
      namespace,
      roleRefKind: 'Role',
      roleRefName: 'edit',
      subjects: undefined,
    });

    const all = [...roleBindings, rbNoSubjects];
    expect(buildUserRoleMap(all).get('alice')).toEqual([roleBindings[0], roleBindings[1]]);
    expect(buildGroupRoleMap(all).get('team-a')).toEqual([roleBindings[0], roleBindings[2]]);
    expect(getRoleRefsForSubject(all, userAlice)).toEqual([roleRefEdit]);
    expect(getRoleAssignmentsForRoleRef(all, roleRefEdit)).toEqual([
      { subject: aliceSubject, roleBinding: roleBindings[0] },
      { subject: teamSubject, roleBinding: roleBindings[0] },
      { subject: aliceSubject, roleBinding: roleBindings[1] },
    ]);
  });

  it('resolves role by roleRef', () => {
    expect(getRoleByRef([role], [clusterRole], roleRefEdit)).toBe(role);
    expect(getRoleByRef([role], [clusterRole], roleRefView)).toBe(clusterRole);
  });

  it('returns undefined when a ClusterRoleRef cannot be resolved (e.g. cluster roles not listable)', () => {
    expect(getRoleByRef([role], [], roleRefView)).toBeUndefined();
  });

  it('returns true when a roleBinding has a subject', () => {
    expect(roleBindingHasSubject(roleBindings[0], userAlice)).toBe(true);
    expect(roleBindingHasSubject(roleBindings[0], groupTeam)).toBe(true);
    expect(roleBindingHasSubject(roleBindings[0], serviceAccountSubject)).toBe(true);
  });

  it('returns false when a roleBinding does not have a subject', () => {
    expect(roleBindingHasSubject(roleBindings[0], { kind: 'User', name: 'unknown' })).toBe(false);
    expect(roleBindingHasSubject(roleBindings[0], { kind: 'Group', name: 'unknown' })).toBe(false);
    expect(
      roleBindingHasSubject(roleBindings[0], { kind: 'ServiceAccount', name: 'unknown' }),
    ).toBe(false);
  });
});
