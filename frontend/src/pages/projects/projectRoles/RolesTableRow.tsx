import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Button, Label, LabelGroup } from '@patternfly/react-core';
import { getRoleDescription, getRoleDisplayName } from '#~/concepts/permissions/utils';
import RoleLabel from '#~/pages/projects/projectPermissions/components/RoleLabel';
import type { RoleListRow } from './types';

type RolesTableRowProps = {
  row: RoleListRow;
  onViewDetails: () => void;
  onViewYAML: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
};

const RolesTableRow: React.FC<RolesTableRowProps> = ({
  row,
  onViewDetails,
  onViewYAML,
  onEdit,
  onDuplicate,
}) => {
  const { roleRef, role, userLabels } = row;
  const isClusterRole = roleRef.kind === 'ClusterRole';
  const displayName = getRoleDisplayName(roleRef, role);
  const description = getRoleDescription(roleRef, role);
  const labelEntries = Object.entries(userLabels);

  const clusterRoleEditTooltip =
    'Cluster roles can be edited only in OpenShift. For help, contact your cluster administrator. ';
  const clusterRoleDuplicateTooltip =
    'Cluster roles can be managed only in OpenShift. For help, contact your cluster administrator.';

  const actionItems = [
    {
      title: 'Edit role',
      onClick: onEdit,
      isAriaDisabled: isClusterRole,
      ...(isClusterRole && {
        tooltipProps: { content: clusterRoleEditTooltip },
      }),
    },
    {
      title: 'Duplicate role',
      onClick: onDuplicate,
      isAriaDisabled: isClusterRole,
      ...(isClusterRole && {
        tooltipProps: { content: clusterRoleDuplicateTooltip },
      }),
    },
    {
      title: 'View YAML',
      onClick: onViewYAML,
    },
  ];

  return (
    <Tr>
      <Td dataLabel="Role name">
        <Button variant="link" isInline onClick={onViewDetails} data-testid="role-name-link">
          {displayName}
        </Button>
      </Td>
      <Td dataLabel="Description">{description ?? '-'}</Td>
      <Td dataLabel="Labels" data-testid="role-labels-cell">
        {labelEntries.length > 0 ? (
          <LabelGroup>
            {labelEntries.map(([key, value]) => (
              <Label key={key} isCompact variant="outline" data-testid={`role-label-${key}`}>
                {value}
              </Label>
            ))}
          </LabelGroup>
        ) : (
          '-'
        )}
      </Td>
      <Td dataLabel="Type">
        <RoleLabel roleRef={roleRef} role={role} isCompact />
      </Td>
      <Td isActionCell modifier="nowrap" style={{ textAlign: 'right' }}>
        <ActionsColumn items={actionItems} />
      </Td>
    </Tr>
  );
};

export default RolesTableRow;
