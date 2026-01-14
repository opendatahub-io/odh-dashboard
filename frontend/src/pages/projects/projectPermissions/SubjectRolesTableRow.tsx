import * as React from 'react';
import {
  Button,
  Split,
  SplitItem,
  Timestamp,
  TimestampTooltipVariant,
} from '@patternfly/react-core';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { getRoleDisplayName, getRoleLabelType } from '#~/concepts/permissions/utils';
import { RoleRef } from '#~/concepts/permissions/types';
import { relativeTime } from '#~/utilities/time';
import { SubjectRoleRow } from './types';
import RoleLabel from './components/RoleLabel';
import { isReversibleRoleRef } from './utils';

type SubjectRolesTableRowProps = {
  row: SubjectRoleRow;
  subjectNameRowSpan: number;
  onRoleClick?: (roleRef: RoleRef) => void;
  onEdit: () => void;
  onRemove: () => void;
};

const SubjectRolesTableRow: React.FC<SubjectRolesTableRowProps> = ({
  row,
  subjectNameRowSpan,
  onRoleClick,
  onEdit,
  onRemove,
}) => {
  const createdDate = row.roleBindingCreationTimestamp
    ? new Date(row.roleBindingCreationTimestamp)
    : undefined;

  const isEditable = isReversibleRoleRef(row.roleRef);
  const actionItems = [
    ...(isEditable ? [{ title: 'Edit', onClick: onEdit }, { isSeparator: true }] : []),
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
            <Button
              variant="link"
              isInline
              onClick={() => onRoleClick?.(row.roleRef)}
              data-testid="role-link"
            >
              {getRoleDisplayName(row.roleRef, row.role)}
            </Button>
          </SplitItem>
          <SplitItem>
            <RoleLabel type={row.role ? getRoleLabelType(row.role) : undefined} />
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
