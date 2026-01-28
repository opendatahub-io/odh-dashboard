import type { RoleRef } from '#~/concepts/permissions/types';
import { hasRoleRef } from '#~/concepts/permissions/utils';
import { DEFAULT_ROLE_REFS } from './const';

// Reversible roles are roles that can be re-added from this UI.
// Today it's limited to the default OpenShift roles we expose in the selector.
export const isReversibleRoleRef = (roleRef: RoleRef): boolean =>
  hasRoleRef(DEFAULT_ROLE_REFS, roleRef);
