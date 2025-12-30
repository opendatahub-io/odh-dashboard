import {
  buildGroupRoleMap,
  buildUserRoleMap,
  getRoleBindingsForSubject,
  getRoleBindingsForSubjectAndRoleRef,
  getRoleByRef,
  getRoleLabelType,
  getRoleRefsForSubject,
  getRoleRefKey,
  getSubjectsForRoleRef,
  getSubjectKey,
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
    expect(getRoleLabelType(dashboardRole)).toBe(RoleLabelType.Dashboard);
    expect(getRoleLabelType(openshiftDefaultRole)).toBe(RoleLabelType.OpenshiftDefault);
    expect(getRoleLabelType(openshiftCustomRole)).toBe(RoleLabelType.OpenshiftCustom);
  });

  it('builds user and group role maps', () => {
    const userMap = buildUserRoleMap(roleBindings);
    const groupMap = buildGroupRoleMap(roleBindings);

    expect(userMap.get('alice')).toEqual([roleBindings[0], roleBindings[1]]);
    expect(groupMap.get('team-a')).toEqual([roleBindings[0], roleBindings[2]]);
  });

  it('returns all roleBindings for a subject', () => {
    expect(getRoleBindingsForSubject(roleBindings, userAlice)).toEqual([
      roleBindings[0],
      roleBindings[1],
    ]);
    expect(getRoleBindingsForSubject(roleBindings, groupTeam)).toEqual([
      roleBindings[0],
      roleBindings[2],
    ]);
  });

  it('returns roleRefs for a subject (deduped)', () => {
    expect(getRoleRefsForSubject(roleBindings, userAlice)).toEqual([roleRefEdit]);
    expect(getRoleRefsForSubject(roleBindings, groupTeam)).toEqual([roleRefEdit, roleRefView]);
  });

  it('returns subjects for a roleRef (deduped) and ignores ServiceAccounts', () => {
    expect(getSubjectsForRoleRef(roleBindings, roleRefEdit)).toEqual([userAlice, groupTeam]);
    expect(getSubjectsForRoleRef(roleBindings, roleRefView)).toEqual([groupTeam]);
  });

  it('returns all roleBindings for a subject + roleRef', () => {
    expect(getRoleBindingsForSubjectAndRoleRef(roleBindings, userAlice, roleRefEdit)).toEqual([
      roleBindings[0],
      roleBindings[1],
    ]);
    expect(getRoleBindingsForSubjectAndRoleRef(roleBindings, groupTeam, roleRefEdit)).toEqual([
      roleBindings[0],
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
    expect(getRoleBindingsForSubject(all, userAlice)).toEqual([roleBindings[0], roleBindings[1]]);
    expect(getRoleRefsForSubject(all, userAlice)).toEqual([roleRefEdit]);
    expect(getSubjectsForRoleRef(all, roleRefEdit)).toEqual([userAlice, groupTeam]);
  });

  it('resolves role by roleRef', () => {
    expect(getRoleByRef([role], [clusterRole], roleRefEdit)).toBe(role);
    expect(getRoleByRef([role], [clusterRole], roleRefView)).toBe(clusterRole);
  });

  it('returns undefined when a ClusterRoleRef cannot be resolved (e.g. cluster roles not listable)', () => {
    expect(getRoleByRef([role], [], roleRefView)).toBeUndefined();
  });
});
