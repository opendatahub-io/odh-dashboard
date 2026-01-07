import type { RoleRef } from '#~/concepts/permissions/types';
import {
  getEditableRoleRefOptions,
  isReversibleRoleRef,
} from '#~/pages/projects/projectPermissions/utils';
import { DEFAULT_ROLE_REFS } from '#~/pages/projects/projectPermissions/const';

describe('project permissions utils', () => {
  const roleRefAdmin: RoleRef = { kind: 'ClusterRole', name: 'admin' };
  const roleRefEdit: RoleRef = { kind: 'ClusterRole', name: 'edit' };

  it('classifies reversible roleRefs (default role refs)', () => {
    expect(isReversibleRoleRef(roleRefAdmin)).toBe(true);
    expect(isReversibleRoleRef(roleRefEdit)).toBe(true);
    expect(isReversibleRoleRef({ kind: 'ClusterRole', name: 'view' })).toBe(false);
    expect(isReversibleRoleRef({ kind: 'Role', name: 'custom-role' })).toBe(false);
  });

  it('returns DEFAULT_ROLE_REFS when current roleRef is reversible', () => {
    expect(getEditableRoleRefOptions(roleRefAdmin)).toEqual(DEFAULT_ROLE_REFS);
    expect(getEditableRoleRefOptions(roleRefEdit)).toEqual(DEFAULT_ROLE_REFS);
  });

  it('includes the current roleRef plus DEFAULT_ROLE_REFS when current roleRef is not reversible', () => {
    const current: RoleRef = { kind: 'Role', name: 'my-role' };
    expect(getEditableRoleRefOptions(current)).toEqual([current, ...DEFAULT_ROLE_REFS]);
  });

  it('dedupes by roleRef key (kind + name)', () => {
    // "admin" is already included in DEFAULT_ROLE_REFS; ensure we don't duplicate it
    expect(getEditableRoleRefOptions(roleRefAdmin)).toEqual(DEFAULT_ROLE_REFS);
  });
});
