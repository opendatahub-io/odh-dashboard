import { mockRoleBindingK8sResource } from '~/__mocks__/mockRoleBindingK8sResource';
import { isCurrentUserChanging } from '~/concepts/roleBinding/utils';

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
