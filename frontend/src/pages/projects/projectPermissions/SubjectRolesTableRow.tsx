import * as React from 'react';
import {
  Button,
  Label,
  Split,
  SplitItem,
  Timestamp,
  TimestampTooltipVariant,
} from '@patternfly/react-core';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { OpenshiftIcon } from '@patternfly/react-icons';
import { getRoleDisplayName, getRoleLabelType } from '#~/concepts/permissions/utils';
import { RoleLabelType, RoleRef } from '#~/concepts/permissions/types';
import { SubjectRoleRow } from './types';

type SubjectRolesTableRowProps = {
  row: SubjectRoleRow;
  subjectNameRowSpan: number;
  onRoleClick?: (roleRef: RoleRef) => void;
};

const renderRoleLabel = (type?: RoleLabelType): React.ReactNode => {
  if (!type || type === RoleLabelType.Dashboard) {
    return null;
  }
  if (type === RoleLabelType.OpenshiftDefault) {
    return (
      <Label variant="outline" isCompact color="blue" icon={<OpenshiftIcon />}>
        OpenShift default
      </Label>
    );
  }
  return (
    <Label variant="outline" isCompact color="purple" icon={<OpenshiftIcon />}>
      OpenShift custom
    </Label>
  );
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
            {renderRoleLabel(row.role ? getRoleLabelType(row.role) : undefined)}
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
