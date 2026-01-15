import * as React from 'react';
import { TableBase } from '#~/components/table';
import useTableColumnSort from '#~/components/table/useTableColumnSort';
import type { RoleBindingKind } from '#~/k8sTypes';
import { RoleAssignment, SupportedSubjectRef } from '#~/concepts/permissions/types';
import { assigneesColumns } from './columns';
import RoleAssigneesTableRow from './RoleAssigneesTableRow';

type RoleAssigneesTableProps = {
  roleAssignments: { subject: SupportedSubjectRef; roleBinding: RoleBindingKind }[];
};

const RoleAssigneesTable: React.FC<RoleAssigneesTableProps> = ({ roleAssignments }) => {
  const sort = useTableColumnSort<RoleAssignment>(assigneesColumns, [], undefined);
  const sortedRoleAssignments = sort.transformData(roleAssignments);

  return (
    <TableBase
      aria-label="Role assignees table"
      data-testid="role-assignees-table"
      variant="compact"
      data={sortedRoleAssignments}
      columns={assigneesColumns}
      getColumnSort={sort.getColumnSort}
      rowRenderer={(row) => <RoleAssigneesTableRow key={row.subject.name} roleAssignment={row} />}
    />
  );
};

export default RoleAssigneesTable;
