import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Button } from '@patternfly/react-core';
import { getRoleDescription, getRoleDisplayName } from '#~/concepts/permissions/utils';
import RoleLabel from '#~/pages/projects/projectPermissions/components/RoleLabel';
import type { RoleListRow } from './types';

type RolesTableRowProps = {
  row: RoleListRow;
  onViewDetails: () => void;
  onPreviewYAML: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
};

const RolesTableRow: React.FC<RolesTableRowProps> = ({
  row,
  onViewDetails,
  onPreviewYAML,
  onEdit,
  onDuplicate,
}) => {
  const { roleRef, role } = row;
  const isClusterRole = roleRef.kind === 'ClusterRole';
  const displayName = getRoleDisplayName(roleRef, role);
  const description = getRoleDescription(roleRef, role);

  const clusterRoleEditTooltip = 'Cluster roles cannot be edited from a project page';
  const clusterRoleDuplicateTooltip = 'Cluster roles cannot be duplicated from a project page';

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
      title: 'Preview YAML',
      onClick: onPreviewYAML,
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
