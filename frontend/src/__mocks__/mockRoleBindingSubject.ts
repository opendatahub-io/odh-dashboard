import type { RoleBindingSubject } from '#~/k8sTypes';

type MockRoleBindingSubjectConfig = {
  name?: string;
  apiGroup?: string;
};

export const mockUserRoleBindingSubject = ({
  name = 'test-user',
  apiGroup = 'rbac.authorization.k8s.io',
}: MockRoleBindingSubjectConfig = {}): RoleBindingSubject => ({
  kind: 'User',
  apiGroup,
  name,
});

export const mockGroupRoleBindingSubject = ({
  name = 'test-group',
  apiGroup = 'rbac.authorization.k8s.io',
}: MockRoleBindingSubjectConfig = {}): RoleBindingSubject => ({
  kind: 'Group',
  apiGroup,
  name,
});

export const mockServiceAccountRoleBindingSubject = ({
  name = 'test-sa',
  apiGroup = 'rbac.authorization.k8s.io',
}: MockRoleBindingSubjectConfig = {}): RoleBindingSubject => ({
  kind: 'ServiceAccount',
  apiGroup,
  name,
});
