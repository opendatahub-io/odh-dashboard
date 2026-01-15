import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import { relativeTime } from '#~/utilities/time';
import { RoleAssignment } from '#~/concepts/permissions/types';

type RoleAssigneesTableRowProps = {
  roleAssignment: RoleAssignment;
};

const RoleAssigneesTableRow: React.FC<RoleAssigneesTableRowProps> = ({ roleAssignment }) => {
  const { creationTimestamp } = roleAssignment.roleBinding.metadata;

  return (
    <Tr>
      <Td dataLabel="Subject">{roleAssignment.subject.name}</Td>
      <Td dataLabel="Subject kind">{roleAssignment.subject.kind}</Td>
      <Td dataLabel="Role binding">{roleAssignment.roleBinding.metadata.name}</Td>
      <Td dataLabel="Date created">
        {creationTimestamp ? (
          <Timestamp
            date={new Date(creationTimestamp)}
            tooltip={{ variant: TimestampTooltipVariant.default }}
          >
            {relativeTime(Date.now(), new Date(creationTimestamp).getTime())}
          </Timestamp>
        ) : (
          '-'
        )}
      </Td>
    </Tr>
  );
};

export default RoleAssigneesTableRow;
