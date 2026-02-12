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

  describe('getRoleRefKey and getSubjectKey', () => {
    it('should create stable key for Role roleRef', () => {
      expect(getRoleRefKey(roleRefEdit)).toBe('Role:edit');
    });

    it('should create stable key for ClusterRole roleRef', () => {
      expect(getRoleRefKey(roleRefView)).toBe('ClusterRole:view');
    });

    it('should create stable key for User subject', () => {
      expect(getSubjectKey(userAlice)).toBe('User:alice');
    });

    it('should create stable key for Group subject', () => {
      expect(getSubjectKey(groupTeam)).toBe('Group:team-a');
    });
  });

  describe('getRoleLabelTypeForRole', () => {
    it('should classify dashboard-labeled role as Dashboard type', () => {
      expect(getRoleLabelTypeForRole(dashboardRole)).toBe(RoleLabelType.Dashboard);
    });

    it('should classify OpenShift bootstrapping role as OpenshiftDefault type', () => {
      expect(getRoleLabelTypeForRole(openshiftDefaultRole)).toBe(RoleLabelType.OpenshiftDefault);
    });

    it('should classify other roles as OpenshiftCustom type', () => {
      expect(getRoleLabelTypeForRole(openshiftCustomRole)).toBe(RoleLabelType.OpenshiftCustom);
    });
  });

  describe('getRoleLabelTypeForRoleRef', () => {
    it('should return OpenshiftDefault for admin ClusterRole', () => {
      expect(getRoleLabelTypeForRoleRef({ kind: 'ClusterRole', name: 'admin' })).toBe(
        RoleLabelType.OpenshiftDefault,
      );
    });

    it('should return OpenshiftDefault for edit ClusterRole', () => {
      expect(getRoleLabelTypeForRoleRef({ kind: 'ClusterRole', name: 'edit' })).toBe(
        RoleLabelType.OpenshiftDefault,
      );
    });

    it('should return OpenshiftCustom for unknown ClusterRole', () => {
      expect(getRoleLabelTypeForRoleRef({ kind: 'ClusterRole', name: 'unknown' })).toBe(
        RoleLabelType.OpenshiftCustom,
      );
    });

    it('should return OpenshiftCustom for unknown Role', () => {
      expect(getRoleLabelTypeForRoleRef({ kind: 'Role', name: 'unknown' })).toBe(
        RoleLabelType.OpenshiftCustom,
      );
    });
  });

  describe('buildUserRoleMap and buildGroupRoleMap', () => {
    it('should build user role map with correct roleBindings', () => {
      const userMap = buildUserRoleMap(roleBindings);
      expect(userMap.get('alice')).toEqual([roleBindings[0], roleBindings[1]]);
    });

    it('should build group role map with correct roleBindings', () => {
      const groupMap = buildGroupRoleMap(roleBindings);
      expect(groupMap.get('team-a')).toEqual([roleBindings[0], roleBindings[2]]);
    });
  });

  describe('getRoleRefsForSubject', () => {
    it('should return deduped roleRefs for user subject', () => {
      expect(getRoleRefsForSubject(roleBindings, userAlice)).toEqual([roleRefEdit]);
    });

    it('should return all roleRefs for group subject', () => {
      expect(getRoleRefsForSubject(roleBindings, groupTeam)).toEqual([roleRefEdit, roleRefView]);
    });
  });

  describe('getRoleAssignmentsForRoleRef', () => {
    it('should return all role assignments for edit roleRef', () => {
      expect(getRoleAssignmentsForRoleRef(roleBindings, roleRefEdit)).toEqual([
        { subject: aliceSubject, roleBinding: roleBindings[0] },
        { subject: teamSubject, roleBinding: roleBindings[0] },
        { subject: aliceSubject, roleBinding: roleBindings[1] },
      ]);
    });

    it('should return role assignments for view roleRef', () => {
      expect(getRoleAssignmentsForRoleRef(roleBindings, roleRefView)).toEqual([
        { subject: teamSubject, roleBinding: roleBindings[2] },
      ]);
    });
  });

  describe('edge cases - RoleBindings with undefined subjects', () => {
    it('should handle RoleBindings with subjects omitted (valid per k8s spec)', () => {
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
  });

  describe('getRoleByRef', () => {
    it('should resolve Role by roleRef', () => {
      expect(getRoleByRef([role], [clusterRole], roleRefEdit)).toBe(role);
    });

    it('should resolve ClusterRole by roleRef', () => {
      expect(getRoleByRef([role], [clusterRole], roleRefView)).toBe(clusterRole);
    });

    it('should return undefined when ClusterRole cannot be resolved', () => {
      expect(getRoleByRef([role], [], roleRefView)).toBeUndefined();
    });
  });

  describe('roleBindingHasSubject', () => {
    it('should return true when roleBinding has user subject', () => {
      expect(roleBindingHasSubject(roleBindings[0], userAlice)).toBe(true);
    });

    it('should return true when roleBinding has group subject', () => {
      expect(roleBindingHasSubject(roleBindings[0], groupTeam)).toBe(true);
    });

    it('should return true when roleBinding has service account subject', () => {
      expect(roleBindingHasSubject(roleBindings[0], serviceAccountSubject)).toBe(true);
    });

    it('should return false when roleBinding does not have user subject', () => {
      expect(roleBindingHasSubject(roleBindings[0], { kind: 'User', name: 'unknown' })).toBe(false);
    });

    it('should return false when roleBinding does not have group subject', () => {
      expect(roleBindingHasSubject(roleBindings[0], { kind: 'Group', name: 'unknown' })).toBe(
        false,
      );
    });

    it('should return false when roleBinding does not have service account subject', () => {
      expect(
        roleBindingHasSubject(roleBindings[0], { kind: 'ServiceAccount', name: 'unknown' }),
      ).toBe(false);
    });
  });
});
