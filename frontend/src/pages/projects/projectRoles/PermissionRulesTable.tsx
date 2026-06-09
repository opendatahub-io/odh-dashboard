import * as React from 'react';
import { TableBase } from '#~/components/table';
import useTableColumnSort from '#~/components/table/useTableColumnSort';
import { permissionRulesColumns } from './permissionRulesColumns';
import PermissionRulesTableRow from './PermissionRulesTableRow';
import type { RuleEntry } from './types';

type PermissionRulesTableProps = {
  rules: RuleEntry[];
  onEditRule: (rule: RuleEntry) => void;
  onRemoveRule: (ruleId: string) => void;
};

const PermissionRulesTable: React.FC<PermissionRulesTableProps> = ({
  rules,
  onEditRule,
  onRemoveRule,
}) => {
  const sort = useTableColumnSort<RuleEntry>(permissionRulesColumns, [], undefined);
  const sortedRules = sort.transformData(rules);

  return (
    <TableBase
      aria-label="Permission rules table"
      data-testid="permission-rules-table"
      variant="compact"
      data={sortedRules}
      columns={permissionRulesColumns}
      getColumnSort={sort.getColumnSort}
      rowRenderer={(rule) => (
        <PermissionRulesTableRow
          key={rule.id}
          rule={rule}
          onEdit={() => onEditRule(rule)}
          onRemove={() => onRemoveRule(rule.id)}
        />
      )}
    />
  );
};

export default PermissionRulesTable;
