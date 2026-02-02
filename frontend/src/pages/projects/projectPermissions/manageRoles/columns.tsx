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
  statusLabel: AssignmentStatus | '';
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
              <strong>AI role:</strong> Roles specifically intended for {ODH_PRODUCT_NAME},
              identified by a unique annotation or label in their YAML definition.
            </Content>
            <Content component={ContentVariants.li}>
              <strong>Openshift default role:</strong> Standard roles that come pre-installed with
              OpenShift, such as Admin and Contributor.
            </Content>
            <Content component={ContentVariants.li}>
              <strong>OpenShift custom role:</strong> Any other roles created and assigned directly
              within OpenShift.
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
    sortable: (a, b) => a.statusLabel.localeCompare(b.statusLabel),
    info: {
      popover: (
        <Content>
          <Content component={ContentVariants.p}>A role can have four possible status:</Content>
          <Content component={ContentVariants.ul}>
            <Content component={ContentVariants.li}>
              <strong>Currently assigned:</strong> The role is already granted to the selected user
              (or group) and is currently in effect.
            </Content>
            <Content component={ContentVariants.li}>
              <strong>Assigning:</strong> The role is not currently granted, but will be assigned
              after the changes are saved.
            </Content>
            <Content component={ContentVariants.li}>
              <strong>Unassigning:</strong> The role is currently granted, but will be removed after
              the changes are saved.
            </Content>
            <Content component={ContentVariants.li}>
              <strong>No status (-):</strong> The role is not granted to the user and no change is
              planned in the current update.
            </Content>
          </Content>
        </Content>
      ),
      ariaLabel: 'Assignment status help',
    },
  },
];
