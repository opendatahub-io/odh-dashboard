import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import type { ResourceRule } from '#~/k8sTypes';

const formatRuleValues = (values?: string[]): string => {
  if (!values || values.length === 0) {
    return '-';
  }
  if (values.includes('*')) {
    return 'All';
  }
  return values.join(', ');
};

type RoleRulesTableRowProps = {
  rule: ResourceRule;
};

const RoleRulesTableRow: React.FC<RoleRulesTableRowProps> = ({ rule }) => (
  <Tr>
    <Td dataLabel="Actions">{formatRuleValues(rule.verbs)}</Td>
    <Td dataLabel="API Groups">{formatRuleValues(rule.apiGroups)}</Td>
    <Td dataLabel="Resources">{formatRuleValues(rule.resources)}</Td>
    <Td dataLabel="Resource names">{formatRuleValues(rule.resourceNames)}</Td>
  </Tr>
);

export default RoleRulesTableRow;
