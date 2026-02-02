import type { ManageRolesRow } from './columns';

export type RoleAssignmentChanges = {
  assigning: ManageRolesRow[];
  unassigning: ManageRolesRow[];
};
