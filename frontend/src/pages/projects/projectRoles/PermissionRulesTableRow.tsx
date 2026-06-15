import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Button, Tooltip } from '@patternfly/react-core';
import { PencilAltIcon, MinusCircleIcon } from '@patternfly/react-icons';
import { formatRuleValues } from './permissionRulesColumns';
import type { RuleEntry } from './types';

type PermissionRulesTableRowProps = {
  rule: RuleEntry;
  onEdit: () => void;
  onRemove: () => void;
};

const PermissionRulesTableRow: React.FC<PermissionRulesTableRowProps> = ({
  rule,
  onEdit,
  onRemove,
}) => (
  <Tr data-testid={`rule-row-${rule.id}`}>
    <Td dataLabel="Resource types">{formatRuleValues(rule.resources)}</Td>
    <Td dataLabel="Actions">{formatRuleValues(rule.verbs)}</Td>
    <Td dataLabel="API group">{formatRuleValues(rule.apiGroups)}</Td>
    <Td dataLabel="Resource name">{formatRuleValues(rule.resourceNames)}</Td>
    <Td isActionCell modifier="nowrap" className="pf-v6-u-text-align-right">
      <Tooltip content="Edit rule">
        <Button
          variant="plain"
          aria-label="Edit rule"
          onClick={onEdit}
          data-testid={`edit-rule-${rule.id}`}
        >
          <PencilAltIcon />
        </Button>
      </Tooltip>
      <Tooltip content="Remove rule">
        <Button
          variant="plain"
          aria-label="Remove rule"
          onClick={onRemove}
          data-testid={`remove-rule-${rule.id}`}
        >
          <MinusCircleIcon />
        </Button>
      </Tooltip>
    </Td>
  </Tr>
);

export default PermissionRulesTableRow;
