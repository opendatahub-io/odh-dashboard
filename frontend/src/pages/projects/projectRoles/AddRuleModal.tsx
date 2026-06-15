import * as React from 'react';
import { Alert, Content, Form, FormGroup, getUniqueId } from '@patternfly/react-core';
import { MultiSelection, SelectionOptions } from '#~/components/MultiSelection';
import ContentModal from '#~/components/modals/ContentModal';
import FieldGroupHelpLabelIcon from '#~/components/FieldGroupHelpLabelIcon';
import VerbsTreeSelect from './VerbsTreeSelect';
import useApiResources, { DiscoveredResource } from './useApiResources';
import type { RuleEntry } from './types';
import {
  CORE_GROUP_ID,
  CORE_GROUP_LABEL,
  extractApiGroups,
  extractResources,
  normalizeVerbs,
} from './ruleModalUtils';

type AddRuleModalProps = {
  existingRule?: RuleEntry;
  onSave: (rule: RuleEntry) => void;
  onClose: () => void;
};

const toApiGroupOptions = (apiGroups: string[]): SelectionOptions[] =>
  apiGroups.map((g) => ({ id: g || CORE_GROUP_ID, name: g || CORE_GROUP_LABEL, selected: false }));

const toResourceOptions = (resources: DiscoveredResource[]): SelectionOptions[] =>
  resources.map((r) => ({
    id: `${r.apiGroup}/${r.name}`,
    name: r.name,
    description: `${r.apiGroup || 'core'} — ${r.kind}`,
    selected: false,
  }));

const AddRuleModal: React.FC<AddRuleModalProps> = ({ existingRule, onSave, onClose }) => {
  const {
    data: apiResourcesData,
    loaded: apiResourcesLoaded,
    error: apiResourcesError,
  } = useApiResources();

  const [selectedApiGroups, setSelectedApiGroups] = React.useState<SelectionOptions[]>(() => {
    if (!existingRule?.apiGroups) {
      return [];
    }
    return existingRule.apiGroups.map((g) => ({
      id: g || CORE_GROUP_ID,
      name: g || CORE_GROUP_LABEL,
      selected: true,
    }));
  });

  const [selectedResources, setSelectedResources] = React.useState<SelectionOptions[]>(() => {
    if (!existingRule?.resources) {
      return [];
    }
    return existingRule.resources.map((r) => ({
      id: r,
      name: r,
      selected: true,
    }));
  });

  const hasReconciled = React.useRef(false);
  React.useEffect(() => {
    if (!apiResourcesLoaded || !existingRule?.resources?.length || hasReconciled.current) {
      return;
    }
    hasReconciled.current = true;

    const discoveredByName = new Map<string, DiscoveredResource[]>();
    for (const r of apiResourcesData.resources) {
      const list = discoveredByName.get(r.name) ?? [];
      list.push(r);
      discoveredByName.set(r.name, list);
    }
    const ruleGroups = new Set(existingRule.apiGroups ?? ['']);

    setSelectedResources((prev) =>
      prev.map((sel) => {
        const candidates = discoveredByName.get(sel.name);
        if (!candidates?.length) {
          return sel;
        }
        const best = candidates.find((r) => ruleGroups.has(r.apiGroup)) ?? candidates[0];
        return {
          ...sel,
          id: `${best.apiGroup}/${best.name}`,
          description: `${best.apiGroup || 'core'} — ${best.kind}`,
        };
      }),
    );
  }, [apiResourcesLoaded, apiResourcesData.resources, existingRule]);

  const [selectedVerbs, setSelectedVerbs] = React.useState<string[]>(
    () => existingRule?.verbs ?? [],
  );

  const apiGroupOptions = React.useMemo((): SelectionOptions[] => {
    const discovered = toApiGroupOptions(apiResourcesData.apiGroups);
    const existingIds = new Set(discovered.map((o) => o.id));
    const custom = selectedApiGroups.filter((s) => !existingIds.has(s.id));
    return [...discovered, ...custom].map((o) => ({
      ...o,
      selected: selectedApiGroups.some((s) => s.id === o.id),
    }));
  }, [apiResourcesData.apiGroups, selectedApiGroups]);

  const resourceOptions = React.useMemo((): SelectionOptions[] => {
    const discovered = toResourceOptions(apiResourcesData.resources);
    const existingIds = new Set(discovered.map((o) => o.id));
    const custom = selectedResources.filter((s) => !existingIds.has(s.id)).map((s) => ({ ...s }));
    return [...discovered, ...custom].map((o) => ({
      ...o,
      selected: selectedResources.some((s) => s.id === o.id),
    }));
  }, [apiResourcesData.resources, selectedResources]);

  const canSave =
    selectedApiGroups.length > 0 && selectedResources.length > 0 && selectedVerbs.length > 0;
  const isEdit = !!existingRule;

  const handleSave = React.useCallback(() => {
    const apiGroups = extractApiGroups(selectedApiGroups);
    const resources = extractResources(selectedResources);
    const verbs = normalizeVerbs(selectedVerbs);

    onSave({
      id: existingRule?.id ?? getUniqueId('rule'),
      apiGroups,
      resources,
      verbs,
      ...(existingRule?.resourceNames ? { resourceNames: existingRule.resourceNames } : {}),
    });
  }, [selectedApiGroups, selectedResources, selectedVerbs, existingRule, onSave]);

  return (
    <ContentModal
      title={isEdit ? 'Edit rule' : 'Add rule'}
      onClose={onClose}
      dataTestId="add-rule-modal"
      buttonActions={[
        {
          label: 'Save',
          onClick: handleSave,
          variant: 'primary',
          isDisabled: !canSave,
          dataTestId: 'modal-submit-button',
        },
        {
          label: 'Cancel',
          onClick: onClose,
          variant: 'link',
          dataTestId: 'modal-cancel-button',
        },
      ]}
      contents={
        <Form>
          {apiResourcesError ? (
            <Alert variant="warning" isInline title="Failed to load API groups and resource types">
              Could not discover API resources from the cluster. You can still enter custom values
              manually.
            </Alert>
          ) : null}
          <FormGroup label="API groups" fieldId="rule-api-groups" isRequired>
            <Content component="p">
              Enter one or more API groups for this rule. Use * to apply to all API groups.
            </Content>
            <MultiSelection
              ariaLabel="Enter or select API groups"
              placeholder="Enter or select API groups"
              id="rule-api-groups"
              toggleTestId="rule-api-groups-toggle"
              value={apiGroupOptions}
              setValue={(selections) => {
                setSelectedApiGroups(selections.filter((s) => s.selected));
              }}
              isCreatable
              isScrollable
              hasCheckbox
              createOptionMessage={(val) => `Use custom API group "${val}"`}
              isDisabled={!apiResourcesLoaded && !apiResourcesError}
            />
          </FormGroup>
          <FormGroup
            label="Resource types"
            fieldId="rule-resource-types"
            isRequired
            labelHelp={
              <FieldGroupHelpLabelIcon content="Specify the Kubernetes resource types this rule applies to. You can select from discovered resources or type a custom resource name." />
            }
          >
            <Content component="p">
              Enter one or more resource types for this rule. Use * to apply to all resource types.
            </Content>
            <MultiSelection
              ariaLabel="Enter or select resource types"
              placeholder="Enter or select resource types"
              id="rule-resource-types"
              toggleTestId="rule-resource-types-toggle"
              value={resourceOptions}
              setValue={(selections) => {
                setSelectedResources(selections.filter((s) => s.selected));
              }}
              isCreatable
              isScrollable
              hasCheckbox
              createOptionMessage={(val) => `Use custom resource type "${val}"`}
              isDisabled={!apiResourcesLoaded && !apiResourcesError}
            />
          </FormGroup>
          <FormGroup label="Verbs" fieldId="rule-verbs" isRequired>
            <VerbsTreeSelect
              selectedVerbs={selectedVerbs}
              onSelectedVerbsChange={setSelectedVerbs}
            />
          </FormGroup>
        </Form>
      }
    />
  );
};

export default AddRuleModal;
