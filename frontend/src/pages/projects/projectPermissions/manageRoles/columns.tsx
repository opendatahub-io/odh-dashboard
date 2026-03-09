import * as React from 'react';
import { Content, ContentVariants } from '@patternfly/react-core';
import type { SortableData } from '#~/components/table/types';
import type { RoleRef } from '#~/concepts/permissions/types';
import type { ClusterRoleKind, RoleKind } from '#~/k8sTypes';
import { AssignmentStatus } from '#~/pages/projects/projectPermissions/types';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';

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
        <Content>
          <Content component={ContentVariants.p}>
            Roles with different labels come from different intentions. The meanings of each label
            are defined as follows:
          </Content>
          <Content component={ContentVariants.ul}>
            <Content component={ContentVariants.li}>
              <strong>AI roles</strong> are intended for use in, and can be assigned from,{' '}
              {ODH_PRODUCT_NAME}.
            </Content>
            <Content component={ContentVariants.li}>
              <strong>OpenShift default roles</strong> are OOTB OpenShift roles that can be assigned
              from OpenShift or {ODH_PRODUCT_NAME}.
            </Content>
            <Content component={ContentVariants.li}>
              <strong>OpenShift custom roles</strong> are admin-created roles that can only be
              assigned from OpenShift.
            </Content>
          </Content>
        </Content>
      ),
      ariaLabel: 'Role type help',
    },
  },
  {
    label: 'Assignment status',
    field: 'status',
    width: 20,
    sortable: (a, b) => (a.statusLabel ?? '').localeCompare(b.statusLabel ?? ''),
    info: {
      popover: (
        <Content>
          <Content component={ContentVariants.p}>A role can have three possible statuses:</Content>
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
        </Content>
      ),
      ariaLabel: 'Assignment status help',
    },
  },
];
