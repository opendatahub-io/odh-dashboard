import * as React from 'react';
import {
  Button,
  Content,
  Flex,
  FlexItem,
  SearchInput,
  Title,
  ToolbarItem,
} from '@patternfly/react-core';
import { ImportIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { TableBase } from '#~/components/table';
import useTableColumnSort from '#~/components/table/useTableColumnSort';
import SimpleSelect from '#~/components/SimpleSelect';

import AddRuleModal from './AddRuleModal';
import PermissionRulesTableRow from './PermissionRulesTableRow';
import { permissionRulesColumns, formatRuleValues } from './permissionRulesColumns';
import type { RuleEntry } from './types';

const FILTER_RESOURCES = 'resources';
const FILTER_API_GROUPS = 'apiGroups';
const FILTER_VERBS = 'verbs';

const FILTER_OPTIONS = [
  { value: FILTER_RESOURCES, label: 'Resource types' },
  { value: FILTER_API_GROUPS, label: 'API groups' },
  { value: FILTER_VERBS, label: 'Actions' },
];

type PermissionRulesSectionProps = {
  rules: RuleEntry[];
  onRulesChange: (rules: RuleEntry[]) => void;
};

const PermissionRulesSection: React.FC<PermissionRulesSectionProps> = ({
  rules,
  onRulesChange,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<RuleEntry | undefined>();
  const [searchValue, setSearchValue] = React.useState('');
  const [filterColumn, setFilterColumn] = React.useState(FILTER_RESOURCES);

  const handleAddRule = React.useCallback(
    (rule: RuleEntry) => {
      const existingIndex = rules.findIndex((r) => r.id === rule.id);
      if (existingIndex >= 0) {
        const updated = [...rules];
        updated[existingIndex] = rule;
        onRulesChange(updated);
      } else {
        onRulesChange([...rules, rule]);
      }
      setIsAddModalOpen(false);
      setEditingRule(undefined);
    },
    [rules, onRulesChange],
  );

  const handleRemoveRule = React.useCallback(
    (ruleId: string) => {
      onRulesChange(rules.filter((r) => r.id !== ruleId));
    },
    [rules, onRulesChange],
  );

  const handleEditRule = React.useCallback((rule: RuleEntry) => {
    setEditingRule(rule);
    setIsAddModalOpen(true);
  }, []);

  const handleCloseModal = React.useCallback(() => {
    setIsAddModalOpen(false);
    setEditingRule(undefined);
  }, []);

  const filteredRules = React.useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    if (!normalizedSearch) {
      return rules;
    }

    return rules.filter((rule) => {
      switch (filterColumn) {
        case FILTER_API_GROUPS:
          return formatRuleValues(rule.apiGroups).toLowerCase().includes(normalizedSearch);
        case FILTER_VERBS:
          return formatRuleValues(rule.verbs).toLowerCase().includes(normalizedSearch);
        case FILTER_RESOURCES:
        default:
          return formatRuleValues(rule.resources).toLowerCase().includes(normalizedSearch);
      }
    });
  }, [rules, searchValue, filterColumn]);

  const sort = useTableColumnSort<RuleEntry>(permissionRulesColumns, [], undefined);
  const sortedRules = sort.transformData(filteredRules);

  const hasRules = rules.length > 0;

  const filterSelectOptions = React.useMemo(
    () => FILTER_OPTIONS.map((opt) => ({ key: opt.value, label: opt.label })),
    [],
  );

  return (
    <>
      <Title headingLevel="h2" size="md">
        Rules
      </Title>
      <Content component="p">
        Define which actions (verbs) this role can perform on specific API groups and resource
        types.
      </Content>

      {hasRules ? (
        <TableBase
          aria-label="Permission rules table"
          data-testid="permission-rules-table"
          variant="compact"
          data={sortedRules}
          columns={permissionRulesColumns}
          getColumnSort={sort.getColumnSort}
          toolbarContent={
            <>
              <ToolbarItem>
                <SimpleSelect
                  options={filterSelectOptions}
                  value={filterColumn}
                  onChange={(key) => {
                    setFilterColumn(key);
                    setSearchValue('');
                  }}
                  dataTestId="rules-filter-toggle"
                  previewDescription={false}
                  autoSelectOnlyOption={false}
                />
              </ToolbarItem>
              <ToolbarItem>
                <SearchInput
                  placeholder="Search by keywords"
                  value={searchValue}
                  onChange={(_e, value) => setSearchValue(value)}
                  onClear={() => setSearchValue('')}
                  data-testid="rules-search-input"
                  aria-label="Search permission rules"
                />
              </ToolbarItem>
              <ToolbarItem>
                <Button
                  variant="tertiary"
                  icon={<PlusCircleIcon />}
                  onClick={() => setIsAddModalOpen(true)}
                  data-testid="role-add-rule"
                >
                  Add rule
                </Button>
              </ToolbarItem>
              <ToolbarItem>
                <Button
                  variant="tertiary"
                  icon={<ImportIcon />}
                  data-testid="role-import-template"
                  isDisabled
                >
                  Import rules from template
                </Button>
              </ToolbarItem>
            </>
          }
          rowRenderer={(rule) => (
            <PermissionRulesTableRow
              key={rule.id}
              rule={rule}
              onEdit={() => handleEditRule(rule)}
              onRemove={() => handleRemoveRule(rule.id)}
            />
          )}
        />
      ) : (
        <>
          <Content component="p" data-testid="permissions-empty-state">
            No rules set for this role.
          </Content>
          <Flex>
            <FlexItem>
              <Button
                variant="link"
                icon={<PlusCircleIcon />}
                onClick={() => setIsAddModalOpen(true)}
                data-testid="role-add-rule"
              >
                Add rule
              </Button>
            </FlexItem>
            <FlexItem>
              <Button
                variant="link"
                icon={<ImportIcon />}
                data-testid="role-import-template"
                isDisabled
              >
                Import rules from template
              </Button>
            </FlexItem>
          </Flex>
        </>
      )}

      {isAddModalOpen ? (
        <AddRuleModal
          existingRule={editingRule}
          onSave={handleAddRule}
          onClose={handleCloseModal}
        />
      ) : null}
    </>
  );
};

export default PermissionRulesSection;
