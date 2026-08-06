import * as React from 'react';
import { List, ListItem } from '@patternfly/react-core';
import { SortableData } from '@odh-dashboard/ui-core';
import { getRoleDescription, getRoleDisplayName } from '#~/concepts/permissions/utils';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import { DESCRIPTION_HELP, LABELS_HELP } from './const';
import type { RoleListRow } from './types';

export const TypeHelpContent: React.FC = () => (
  <List>
    <ListItem>
      <strong>AI roles</strong> are assignable and editable within {ODH_PRODUCT_NAME}.
    </ListItem>
    <ListItem>
      <strong>Cluster roles</strong> are managed in OpenShift. Assignable here if they have the AI
      label, but editing requires OpenShift access.
    </ListItem>
    <ListItem>
      <strong>OpenShift default roles</strong> are built-in OpenShift roles. Some are assignable
      here, but none are editable.
    </ListItem>
    <ListItem>
      <strong>OpenShift custom roles</strong> are created in OpenShift. Can be unassigned here, but
      not assigned or edited.
    </ListItem>
  </List>
);

export const columns: SortableData<RoleListRow>[] = [
  {
    field: 'name',
    label: 'Name',
    width: 25,
    sortable: (a, b) =>
      getRoleDisplayName(a.roleRef, a.role).localeCompare(getRoleDisplayName(b.roleRef, b.role)),
  },
  {
    field: 'description',
    label: 'Description',
    width: 30,
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
    field: 'labels',
    label: 'Labels',
    width: 20,
    sortable: (a, b) =>
      Object.entries(a.userLabels)
        .toSorted(([ak], [bk]) => ak.localeCompare(bk))
        .map(([k, v]: [string, string]) => `${k}=${v}`)
        .join(',')
        .localeCompare(
          Object.entries(b.userLabels)
            .toSorted(([ak], [bk]) => ak.localeCompare(bk))
            .map(([k, v]: [string, string]) => `${k}=${v}`)
            .join(','),
        ),
    info: {
      popover: LABELS_HELP,
      ariaLabel: 'Labels help',
    },
  },
  {
    field: 'type',
    label: 'Role types',
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
