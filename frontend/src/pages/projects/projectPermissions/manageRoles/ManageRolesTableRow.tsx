import * as React from 'react';
import { Button, Flex, FlexItem, Label, Popover, PopoverPosition } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { t_global_spacer_xs as ExtraSmallSpacerSize } from '@patternfly/react-tokens';
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
import { ODH_PRODUCT_NAME } from '#~/utilities/const.ts';
import type { ManageRolesRow } from './columns';

export type ManageRolesTableRowProps = {
  rowIndex: number;
  row: ManageRolesRow;
  selections: RoleRef[];
  onToggle: (roleRef: RoleRef) => void;
};

const getAssignmentLabelColor = (statusLabel: AssignmentStatus) => {
  switch (statusLabel) {
    case AssignmentStatus.CurrentlyAssigned:
      return 'green';
    case AssignmentStatus.Assigning:
      return 'yellow';
    case AssignmentStatus.Unassigning:
      return 'red';
  }
};

const CustomUnassignPopover = ({
  children,
  position,
}: {
  children: React.ReactElement;
  position: PopoverPosition;
}) => {
  return (
    <Popover
      position={position}
      bodyContent={
        <>
          <strong>OpenShift custom roles</strong> cannot be assigned from {ODH_PRODUCT_NAME}. To
          reassign this role after removing it, you or an administrator must do so from OpenShift.
        </>
      }
    >
      {children}
    </Popover>
  );
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

  const assignmentLabelColor = row.statusLabel
    ? getAssignmentLabelColor(row.statusLabel)
    : undefined;

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
            {isCustomUnassign ? (
              <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                <FlexItem>
                  <CustomUnassignPopover position={PopoverPosition.top}>
                    <Label variant="filled" color={assignmentLabelColor} isCompact isClickable>
                      {row.statusLabel}
                    </Label>
                  </CustomUnassignPopover>
                </FlexItem>
                <FlexItem>
                  <CustomUnassignPopover position={PopoverPosition.bottom}>
                    <Button
                      variant="link"
                      isInline
                      style={{
                        color: 'red',
                        textDecoration: 'underline dashed',
                        textUnderlineOffset: ExtraSmallSpacerSize.var,
                      }}
                    >
                      Cannot be reassigned in {ODH_PRODUCT_NAME}
                    </Button>
                  </CustomUnassignPopover>
                </FlexItem>
              </Flex>
            ) : (
              <Label variant="outline" color={assignmentLabelColor} isCompact>
                {row.statusLabel}
              </Label>
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
