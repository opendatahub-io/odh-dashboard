import * as React from 'react';
import { Label } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { getRoleDescription, hasRoleRef } from '#~/concepts/permissions/utils';
import type { RoleRef } from '#~/concepts/permissions/types';
import RoleLabel from '#~/pages/projects/projectPermissions/components/RoleLabel';
import RoleDetailsLink from '#~/pages/projects/projectPermissions/components/RoleDetailsLink';
import type { ManageRolesRow } from './columns';

export type ManageRolesTableRowProps = {
  rowIndex: number;
  row: ManageRolesRow;
  selections: RoleRef[];
  onToggle: (roleRef: RoleRef) => void;
};

const ManageRolesTableRow: React.FC<ManageRolesTableRowProps> = ({
  rowIndex,
  row,
  selections,
  onToggle,
}) => (
  <Tr data-testid={`manage-roles-row-${row.roleRef.kind}-${row.roleRef.name}`}>
    <Td
      select={{
        rowIndex,
        isSelected: hasRoleRef(selections, row.roleRef),
        onSelect: () => onToggle(row.roleRef),
      }}
      aria-label={`Toggle ${row.displayName}`}
    />
    <Td dataLabel="Role">
      <RoleDetailsLink roleRef={row.roleRef} role={row.role} />
    </Td>
    <Td dataLabel="Description">{getRoleDescription(row.roleRef, row.role) ?? '--'}</Td>
    <Td dataLabel="Role type">
      <RoleLabel roleRef={row.roleRef} role={row.role} isCompact />
    </Td>
    <Td dataLabel="Assignment status">
      {row.statusLabel ? (
        <Label variant="outline" isCompact>
          {row.statusLabel}
        </Label>
      ) : (
        '--'
      )}
    </Td>
  </Tr>
);

export default ManageRolesTableRow;
