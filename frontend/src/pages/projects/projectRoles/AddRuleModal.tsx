import * as React from 'react';
import { Alert, Form, FormGroup, getUniqueId } from '@patternfly/react-core';
import ContentModal from '@odh-dashboard/ui-core/components/ContentModal';
import FieldGroupHelpLabelIcon from '@odh-dashboard/ui-core/components/FieldGroupHelpLabelIcon';
import VerbsTreeSelect from './VerbsTreeSelect';
import ResourcesTreeSelect from './ResourcesTreeSelect';
import ApiGroupsTreeSelect from './ApiGroupsTreeSelect';
import useApiResources, { type ApiResourcesData } from './useApiResources';
import type { RuleEntry } from './types';
import { normalizeVerbs } from './ruleModalUtils';
import { ALL_RESOURCES_WILDCARD, buildResourceToApiGroupMap } from './resourceCategories';
import { ALL_API_GROUPS_WILDCARD } from './apiGroupCategories';

const EMPTY_API_RESOURCES_DATA: ApiResourcesData = { apiGroups: [], resources: [] };

type AddRuleModalProps = {
  existingRule?: RuleEntry;
  onSave: (rule: RuleEntry) => void;
  onClose: () => void;
};

const AddRuleModal: React.FC<AddRuleModalProps> = ({ existingRule, onSave, onClose }) => {
  const {
    data: apiResourcesData,
    loaded: apiResourcesLoaded,
    error: apiResourcesError,
  } = useApiResources();

  const [selectedApiGroups, setSelectedApiGroups] = React.useState<string[]>(
    () => existingRule?.apiGroups ?? [],
  );

  const [selectedResources, setSelectedResources] = React.useState<string[]>(
    () => existingRule?.resources ?? [],
  );

  const [selectedVerbs, setSelectedVerbs] = React.useState<string[]>(
    () => existingRule?.verbs ?? [],
  );

  // selectedApiGroups: chips + YAML (user-selected and auto-added from resources).
  // explicitApiGroups: groups chosen in the API groups field this session. Drives
  // Resource types filtering. Starts empty in add and edit so loaded groups do not
  // lock the list; auto-adding (notebooks → kubeflow.org) also must not lock it.
  const [explicitApiGroups, setExplicitApiGroups] = React.useState<string[]>([]);

  const resolvedApiResourcesData = apiResourcesLoaded ? apiResourcesData : EMPTY_API_RESOURCES_DATA;

  const resourceToApiGroupMap = React.useMemo(
    () => buildResourceToApiGroupMap(resolvedApiResourcesData.resources),
    [resolvedApiResourcesData.resources],
  );

  const handleResourcesChange = React.useCallback(
    (newResources: string[]) => {
      setSelectedResources(newResources);

      // Wildcards mean "all"; do not add or strip concrete API groups.
      if (
        newResources.includes(ALL_RESOURCES_WILDCARD) ||
        selectedApiGroups.includes(ALL_API_GROUPS_WILDCARD)
      ) {
        return;
      }

      const addedResources = newResources.filter((r) => !selectedResources.includes(r));
      const removedResources = selectedResources.filter((r) => !newResources.includes(r));
      const groupsToAdd = new Set<string>();
      const groupsToRemove = new Set<string>();

      for (const resource of addedResources) {
        const apiGroup = resourceToApiGroupMap.get(resource);
        if (apiGroup !== undefined) {
          groupsToAdd.add(apiGroup);
        }
      }

      // Drop a group only when no remaining mapped resource still needs it (cascade up).
      for (const resource of removedResources) {
        const apiGroup = resourceToApiGroupMap.get(resource);
        if (apiGroup === undefined) {
          continue;
        }
        const stillNeeded = newResources.some((r) => resourceToApiGroupMap.get(r) === apiGroup);
        if (!stillNeeded) {
          groupsToRemove.add(apiGroup);
        }
      }

      // All resources → empty does not yield a mapped removal (`*` is not in the map).
      const clearAutoAddedGroups = newResources.length === 0;
      if (groupsToAdd.size === 0 && groupsToRemove.size === 0 && !clearAutoAddedGroups) {
        return;
      }

      setSelectedApiGroups((prev) => {
        let next = prev.filter((g) => !groupsToRemove.has(g));
        for (const g of groupsToAdd) {
          if (!next.includes(g)) {
            next.push(g);
          }
        }
        if (clearAutoAddedGroups) {
          next = next.filter((g) => explicitApiGroups.includes(g));
        }
        return next;
      });
      if (groupsToRemove.size > 0) {
        setExplicitApiGroups((prev) => prev.filter((g) => !groupsToRemove.has(g)));
      }
    },
    [selectedResources, selectedApiGroups, explicitApiGroups, resourceToApiGroupMap],
  );

  const handleApiGroupsChange = React.useCallback(
    (newApiGroups: string[]) => {
      setSelectedApiGroups(newApiGroups);
      // Touching this field turns on resource filtering for the current group selection.
      setExplicitApiGroups(newApiGroups);

      // `*` on either field does not orphan concrete selections.
      if (newApiGroups.includes(ALL_API_GROUPS_WILDCARD)) {
        return;
      }

      if (selectedResources.includes(ALL_RESOURCES_WILDCARD)) {
        return;
      }

      const removedGroups = selectedApiGroups.filter((g) => !newApiGroups.includes(g));
      if (removedGroups.length === 0) {
        return;
      }

      // Drop mapped resources that no longer have an API group (custom names stay).
      const allGroupsWereSelected = selectedApiGroups.includes(ALL_API_GROUPS_WILDCARD);
      const allowedGroups = new Set(newApiGroups);
      const orphanedResources = selectedResources.filter((r) => {
        const group = resourceToApiGroupMap.get(r);
        if (group === undefined) {
          return false;
        }
        if (newApiGroups.length === 0) {
          return allGroupsWereSelected || removedGroups.includes(group);
        }
        return !allowedGroups.has(group);
      });

      if (orphanedResources.length > 0) {
        const orphanSet = new Set(orphanedResources);
        setSelectedResources((prev) => prev.filter((r) => !orphanSet.has(r)));
      }
    },
    [selectedApiGroups, selectedResources, resourceToApiGroupMap],
  );

  const canSave =
    selectedApiGroups.length > 0 && selectedResources.length > 0 && selectedVerbs.length > 0;
  const isEdit = !!existingRule;

  const handleSave = React.useCallback(() => {
    // `*` already covers every value; drop extras so YAML stays `["*"]`.
    const resources = selectedResources.includes(ALL_RESOURCES_WILDCARD)
      ? [ALL_RESOURCES_WILDCARD]
      : [...selectedResources];
    const apiGroups = selectedApiGroups.includes(ALL_API_GROUPS_WILDCARD)
      ? [ALL_API_GROUPS_WILDCARD]
      : [...selectedApiGroups];
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
      description="Define what resources this rule applies to and what operations are permitted."
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
          <FormGroup
            label="API groups"
            fieldId="rule-api-groups"
            isRequired
            labelHelp={
              <FieldGroupHelpLabelIcon content="Select an API group to narrow the resource types list. Choosing a resource type also adds its API group." />
            }
          >
            <ApiGroupsTreeSelect
              selectedApiGroups={selectedApiGroups}
              onSelectedApiGroupsChange={handleApiGroupsChange}
              apiResourcesData={resolvedApiResourcesData}
            />
          </FormGroup>
          <FormGroup
            label="Resource types"
            fieldId="rule-resource-types"
            isRequired
            labelHelp={
              <FieldGroupHelpLabelIcon content="Search or select resource types, or type a custom name. If you selected API groups, only matching resources are listed." />
            }
          >
            <ResourcesTreeSelect
              selectedResources={selectedResources}
              onSelectedResourcesChange={handleResourcesChange}
              // Filter only from API groups the user picked, not auto-added groups.
              filterByApiGroups={explicitApiGroups}
              apiResourcesData={resolvedApiResourcesData}
            />
          </FormGroup>
          <FormGroup label="Permitted operations" fieldId="rule-verbs" isRequired>
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
