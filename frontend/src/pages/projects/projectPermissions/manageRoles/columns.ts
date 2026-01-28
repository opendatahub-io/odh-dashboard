import type { SortableData } from '#~/components/table/types';
import type { RoleRef } from '#~/concepts/permissions/types';
import type { ClusterRoleKind, RoleKind } from '#~/k8sTypes';

export type ManageRolesRow = {
  roleRef: RoleRef;
  role?: RoleKind | ClusterRoleKind;
  displayName: string;
  statusLabel: string;
};

export const manageRolesColumns: SortableData<ManageRolesRow>[] = [
  { label: '', field: 'checkbox', width: 10, sortable: false },
  {
    label: 'Role',
    field: 'role',
    width: 20,
    sortable: (a, b) => a.displayName.localeCompare(b.displayName),
  },
  { label: 'Description', field: 'description', width: 35, sortable: false },
  { label: 'Role type', field: 'roleType', width: 20, sortable: false },
  {
    label: 'Assignment status',
    field: 'status',
    width: 20,
    sortable: (a, b) => a.statusLabel.localeCompare(b.statusLabel),
  },
];
