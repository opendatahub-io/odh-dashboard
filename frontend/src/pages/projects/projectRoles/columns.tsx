import * as React from 'react';
import { List, ListItem } from '@patternfly/react-core';
import { SortableData } from '@odh-dashboard/ui-core';
import { getRoleDescription, getRoleDisplayName } from '#~/concepts/permissions/utils';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import type { RoleListRow } from './types';

export const ROLE_NAME_HELP = 'This is the name of the role in OpenShift.';

export const DESCRIPTION_HELP =
  "A brief summary of the role's purpose and the permissions it grants.";

export const TypeHelpContent: React.FC = () => (
  <List>
    <ListItem>
      <strong>AI roles</strong> are intended for use in, and can be assigned from,{' '}
      {ODH_PRODUCT_NAME}.
    </ListItem>
    <ListItem>
      <strong>OpenShift default roles</strong> are OOTB OpenShift roles that can be assigned from
      OpenShift or {ODH_PRODUCT_NAME}.
    </ListItem>
    <ListItem>
      <strong>Cluster roles</strong> apply across all namespaces and cannot be edited from a project
      page.
    </ListItem>
  </List>
);

export const columns: SortableData<RoleListRow>[] = [
  {
    field: 'name',
    label: 'Role name',
    width: 35,
    sortable: (a, b) =>
      getRoleDisplayName(a.roleRef, a.role).localeCompare(getRoleDisplayName(b.roleRef, b.role)),
    info: {
      popover: ROLE_NAME_HELP,
      ariaLabel: 'Role name help',
    },
  },
  {
    field: 'description',
    label: 'Description',
    width: 40,
    sortable: (a, b) =>
      (getRoleDescription(a.roleRef, a.role) ?? '').localeCompare(
        getRoleDescription(b.roleRef, b.role) ?? '',
      ),
    info: {
      popover: DESCRIPTION_HELP,
      ariaLabel: 'Description help',
    },
  },
  {
    field: 'type',
    label: 'Type',
    width: 15,
    sortable: false,
    info: {
      popover: <TypeHelpContent />,
      ariaLabel: 'Type help',
    },
  },
  {
    field: 'kebab',
    label: '',
    width: 10,
    sortable: false,
  },
];
