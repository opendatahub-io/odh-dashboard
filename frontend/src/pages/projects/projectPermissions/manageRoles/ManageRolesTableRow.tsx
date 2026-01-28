import * as React from 'react';
import { HelperText, HelperTextItem, Label } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import {
  getRoleDescription,
  getRoleLabelTypeForRole,
  getRoleLabelTypeForRoleRef,
  hasRoleRef,
} from '#~/concepts/permissions/utils';
import { RoleLabelType } from '#~/concepts/permissions/types';
import { AssignmentStatus } from '#~/pages/projects/projectPermissions/types';
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
}) => {
  const labelType = row.role
    ? getRoleLabelTypeForRole(row.role)
    : getRoleLabelTypeForRoleRef(row.roleRef);
  const isCustomUnassign =
    row.statusLabel === AssignmentStatus.Unassigning && labelType === RoleLabelType.OpenshiftCustom;

  return (
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
        <RoleDetailsLink roleRef={row.roleRef} role={row.role} showAssigneesTab={false} />
      </Td>
      <Td dataLabel="Description">{getRoleDescription(row.roleRef, row.role) ?? '-'}</Td>
      <Td dataLabel="Role type">
        <RoleLabel roleRef={row.roleRef} role={row.role} isCompact />
      </Td>
      <Td dataLabel="Assignment status">
        {row.statusLabel ? (
          <>
            <Label
              variant={isCustomUnassign ? 'filled' : 'outline'}
              color={row.statusLabel === AssignmentStatus.CurrentlyAssigned ? 'green' : 'red'}
              isCompact
            >
              {row.statusLabel}
            </Label>
            {isCustomUnassign && (
              <HelperText>
                <HelperTextItem variant="warning">
                  Role can only be re-assigned in OpenShift
                </HelperTextItem>
              </HelperText>
            )}
          </>
        ) : (
          '-'
        )}
      </Td>
    </Tr>
  );
};

export default ManageRolesTableRow;
