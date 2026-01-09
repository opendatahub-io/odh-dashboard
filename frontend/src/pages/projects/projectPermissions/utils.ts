import type { RoleRef } from '#~/concepts/permissions/types';
import { getRoleRefKey, hasRoleRef } from '#~/concepts/permissions/utils';
import { DEFAULT_ROLE_REFS } from './const';

// Reversible roles are roles that can be re-added from this UI.
// Today it's limited to the default OpenShift roles we expose in the selector.
export const isReversibleRoleRef = (roleRef: RoleRef): boolean =>
  hasRoleRef(DEFAULT_ROLE_REFS, roleRef);

// Role options for the inline edit flow.
//
// - If the current role is reversible, only show the reversible roles (currently Admin/Contributor).
// - If the current role is not reversible, include it as a "one-way" option (users can replace it,
//   but cannot add it back later from this UI).
export const getEditableRoleRefOptions = (currentRoleRef: RoleRef): RoleRef[] => {
  if (isReversibleRoleRef(currentRoleRef)) {
    return DEFAULT_ROLE_REFS;
  }

  const options = [currentRoleRef, ...DEFAULT_ROLE_REFS];
  const seen = new Set<string>();
  return options.filter((r) => {
    const key = getRoleRefKey(r);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};
