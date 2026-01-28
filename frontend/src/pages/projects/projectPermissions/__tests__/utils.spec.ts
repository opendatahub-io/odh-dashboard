import type { RoleRef } from '#~/concepts/permissions/types';
import { isReversibleRoleRef } from '#~/pages/projects/projectPermissions/utils';

describe('project permissions utils', () => {
  const roleRefAdmin: RoleRef = { kind: 'ClusterRole', name: 'admin' };
  const roleRefEdit: RoleRef = { kind: 'ClusterRole', name: 'edit' };

  it('classifies reversible roleRefs (default role refs)', () => {
    expect(isReversibleRoleRef(roleRefAdmin)).toBe(true);
    expect(isReversibleRoleRef(roleRefEdit)).toBe(true);
    expect(isReversibleRoleRef({ kind: 'ClusterRole', name: 'view' })).toBe(false);
    expect(isReversibleRoleRef({ kind: 'Role', name: 'custom-role' })).toBe(false);
  });
});
