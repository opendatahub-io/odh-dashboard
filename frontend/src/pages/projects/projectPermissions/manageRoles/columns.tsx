import * as React from 'react';
import { Content, ContentVariants, List, ListItem } from '@patternfly/react-core';
import type { SortableData } from '@odh-dashboard/ui-core';
import type { RoleRef } from '#~/concepts/permissions/types';
import type { ClusterRoleKind, RoleKind } from '#~/k8sTypes';
import { AssignmentStatus } from '#~/pages/projects/projectPermissions/types';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import { fireSimpleTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';

export type ManageRolesRow = {
  roleRef: RoleRef;
  role?: RoleKind | ClusterRoleKind;
  displayName: string;
  statusLabel?: AssignmentStatus;
};

export const manageRolesColumns: SortableData<ManageRolesRow>[] = [
  { label: '', field: 'checkbox', width: 10, sortable: false },
  {
    label: 'Role name',
    field: 'role',
    width: 20,
    sortable: (a, b) => a.displayName.localeCompare(b.displayName),
  },
  { label: 'Description', field: 'description', width: 35, sortable: false },
  {
    label: 'Role type',
    field: 'roleType',
    width: 20,
    sortable: false,
    info: {
      popover: (
        <List>
          <ListItem>
            <strong>AI roles</strong> are assignable and editable within {ODH_PRODUCT_NAME}.
          </ListItem>
          <ListItem>
            <strong>Cluster roles</strong> are managed in OpenShift. Assignable here if they have
            the AI label, but editing requires OpenShift access.
          </ListItem>
          <ListItem>
            <strong>OpenShift default roles</strong> are built-in OpenShift roles. Some are
            assignable here, but none are editable.
          </ListItem>
          <ListItem>
            <strong>OpenShift custom roles</strong> are created in OpenShift. Can be unassigned
            here, but not assigned or edited.
          </ListItem>
        </List>
      ),
      ariaLabel: 'Role type help',
      popoverProps: {
        onShown: (): void => {
          fireSimpleTrackingEvent('RBAC Help Reviewed');
        },
      },
    },
  },
  {
    label: 'Assignment status',
    field: 'status',
    width: 20,
    sortable: (a, b) => (a.statusLabel ?? '').localeCompare(b.statusLabel ?? ''),
    info: {
      popover: (
        <Content component={ContentVariants.ul}>
          <Content component={ContentVariants.li}>
            <strong>Assigned:</strong> The role is applied to the user or group.
          </Content>
          <Content component={ContentVariants.li}>
            <strong>Assigning:</strong> The role will be applied when changes are saved.
          </Content>
          <Content component={ContentVariants.li}>
            <strong>Unassigning:</strong> The role will be revoked when changes are saved.
          </Content>
        </Content>
      ),
      ariaLabel: 'Assignment status help',
      popoverProps: {
        onShown: (): void => {
          fireSimpleTrackingEvent('RBAC Help Reviewed');
        },
      },
    },
  },
];

export const ASSIGNMENT_STATUS_COLUMN_INDEX = manageRolesColumns.findIndex(
  ({ field }) => field === 'status',
);
