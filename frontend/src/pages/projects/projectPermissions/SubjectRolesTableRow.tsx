import * as React from 'react';
import { Split, SplitItem, Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { relativeTime } from '#~/utilities/time';
import { SubjectRoleRow } from './types';
import RoleLabel from './components/RoleLabel';
import RoleDetailsLink from './components/RoleDetailsLink';

type SubjectRolesTableRowProps = {
  row: SubjectRoleRow;
  subjectNameRowSpan: number;
  onManageRoles: () => void;
  onRemove: () => void;
};

const SubjectRolesTableRow: React.FC<SubjectRolesTableRowProps> = ({
  row,
  subjectNameRowSpan,
  onManageRoles,
  onRemove,
}) => {
  const createdDate = row.roleBindingCreationTimestamp
    ? new Date(row.roleBindingCreationTimestamp)
    : undefined;

  const actionItems = [
    { title: 'Manage permissions', onClick: onManageRoles },
    { title: 'Unassign', onClick: onRemove },
  ];

  return (
    <Tr>
      {subjectNameRowSpan > 0 ? (
        <Td dataLabel="Name" rowSpan={subjectNameRowSpan}>
          {row.subjectName}
        </Td>
      ) : null}
      <Td
        dataLabel="Role"
        style={{
          paddingInlineStart: 'var(--pf-v6-c-table--cell--Padding--base)',
        }}
      >
        <Split hasGutter>
          <SplitItem>
            <RoleDetailsLink roleRef={row.roleRef} role={row.role} />
          </SplitItem>
          <SplitItem>
            <RoleLabel roleRef={row.roleRef} role={row.role} isCompact />
          </SplitItem>
        </Split>
      </Td>
      <Td dataLabel="Date created">
        {createdDate ? (
          <Timestamp date={createdDate} tooltip={{ variant: TimestampTooltipVariant.default }}>
            {relativeTime(Date.now(), createdDate.getTime())}
          </Timestamp>
        ) : (
          '-'
        )}
      </Td>
      <Td isActionCell modifier="nowrap" style={{ textAlign: 'right' }}>
        <ActionsColumn items={actionItems} />
      </Td>
    </Tr>
  );
};

export default SubjectRolesTableRow;
