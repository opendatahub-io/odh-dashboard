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
import { SubjectRoleRow } from './types';
import RoleLabel from './components/RoleLabel';

type SubjectRolesTableRowProps = {
  row: SubjectRoleRow;
  subjectNameRowSpan: number;
  onRoleClick?: (roleRef: RoleRef) => void;
};

const formatDate = (timestamp?: string): string => {
  if (!timestamp) {
    return '-';
  }
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) {
    return '-';
  }
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const SubjectRolesTableRow: React.FC<SubjectRolesTableRowProps> = ({
  row,
  subjectNameRowSpan,
  onRoleClick,
}) => {
  const createdDate = row.roleBindingCreationTimestamp
    ? new Date(row.roleBindingCreationTimestamp)
    : undefined;

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
            {formatDate(row.roleBindingCreationTimestamp)}
          </Timestamp>
        ) : (
          '-'
        )}
      </Td>
      <Td isActionCell modifier="nowrap" style={{ textAlign: 'right' }}>
        <ActionsColumn
          items={[
            { title: 'Edit', onClick: () => undefined },
            { isSeparator: true },
            { title: 'Delete', onClick: () => undefined },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default SubjectRolesTableRow;
