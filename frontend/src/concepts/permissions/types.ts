import type { RoleBindingKind, RoleBindingRoleRef, RoleBindingSubject } from '#~/k8sTypes';

export enum RoleLabelType {
  Dashboard = 'dashboard',
  OpenshiftDefault = 'openshift-default',
  OpenshiftCustom = 'openshift-custom',
}

export type SupportedSubjectKind = 'User' | 'Group';

export type SupportedSubjectRef = Pick<RoleBindingSubject, 'kind' | 'name'> & {
  kind: SupportedSubjectKind;
};

export type RoleAssignment = {
  subject: SupportedSubjectRef;
  roleBinding: RoleBindingKind;
};

export type RoleRef = Pick<RoleBindingRoleRef, 'kind' | 'name'>;

export type RoleRefKey = string;
export type SubjectKey = string;
