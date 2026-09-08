import * as React from 'react';
import {
  Button,
  Content,
  Flex,
  FlexItem,
  FormGroup,
  FormGroupLabelHelp,
  Popover,
  SearchInput,
  ToolbarItem,
} from '@patternfly/react-core';
import { ImportIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { TableBase, useTableColumnSort } from '@odh-dashboard/ui-core';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';

import { fireMiscTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import AddRuleModal from './AddRuleModal';
import PermissionRulesTableRow from './PermissionRulesTableRow';
import { permissionRulesColumns, formatRuleValues } from './permissionRulesColumns';
import { CUSTOM_ROLE_TRACKING_EVENTS } from './trackingUtils';
import type { RuleEntry } from './types';
import { RULES_FORM_DESCRIPTION } from './const';

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
  onImportTemplate: () => void;
};

const PermissionRulesSection: React.FC<PermissionRulesSectionProps> = ({
  rules,
  onRulesChange,
  onImportTemplate,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<RuleEntry | undefined>();
  const [searchValue, setSearchValue] = React.useState('');
  const [filterColumn, setFilterColumn] = React.useState(FILTER_RESOURCES);

  const handleAddRule = React.useCallback(
    (rule: RuleEntry) => {
      const isRuleEdit = rules.some((r) => r.id === rule.id);
      if (isRuleEdit) {
        const updated = [...rules];
        updated[rules.findIndex((r) => r.id === rule.id)] = rule;
        onRulesChange(updated);
      } else {
        onRulesChange([...rules, rule]);
      }

      fireMiscTrackingEvent(CUSTOM_ROLE_TRACKING_EVENTS.RULE_ADDED, {
        apiGroups: JSON.stringify(rule.apiGroups),
        resourceTypes: JSON.stringify(rule.resources),
        verbs: JSON.stringify(rule.verbs),
        totalRulesCount: isRuleEdit ? rules.length : rules.length + 1,
        isEdit: isRuleEdit,
      });

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
    <FormGroup
      label="Rules"
      fieldId="role-rules"
      labelHelp={
        <Popover bodyContent="Rules define permissions for this role. In Kubernetes, rules specify which operations (verbs) users can perform on which resources.">
          <FormGroupLabelHelp
            aria-label="More info about adding rules"
            data-testid="create-project-role-rule-help-popover"
          />
        </Popover>
      }
    >
      <Content component="p">{RULES_FORM_DESCRIPTION}</Content>

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
            No rules added
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
                onClick={onImportTemplate}
              >
                Add rules from template
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
    </FormGroup>
  );
};

export default PermissionRulesSection;
