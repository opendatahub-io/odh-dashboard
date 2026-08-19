import * as React from 'react';
import { Alert, Form, FormGroup, getUniqueId } from '@patternfly/react-core';
import ContentModal from '@odh-dashboard/ui-core/components/ContentModal';
import FieldGroupHelpLabelIcon from '@odh-dashboard/ui-core/components/FieldGroupHelpLabelIcon';
import VerbsTreeSelect from './VerbsTreeSelect';
import ResourcesTreeSelect from './ResourcesTreeSelect';
import ApiGroupsTreeSelect from './ApiGroupsTreeSelect';
import useApiResources from './useApiResources';
import type { RuleEntry } from './types';
import { normalizeVerbs } from './ruleModalUtils';
import { ALL_RESOURCES_WILDCARD } from './resourceCategories';

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

  const canSave =
    selectedApiGroups.length > 0 && selectedResources.length > 0 && selectedVerbs.length > 0;
  const isEdit = !!existingRule;

  const handleSave = React.useCallback(() => {
    const resources = selectedResources.includes(ALL_RESOURCES_WILDCARD)
      ? [ALL_RESOURCES_WILDCARD]
      : [...selectedResources];
    const verbs = normalizeVerbs(selectedVerbs);

    onSave({
      id: existingRule?.id ?? getUniqueId('rule'),
      apiGroups: [...selectedApiGroups],
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
              <FieldGroupHelpLabelIcon content="API groups organize Kubernetes resources by functionality. Selecting an API group filters the Resource types list to show only resources in that group." />
            }
          >
            <ApiGroupsTreeSelect
              selectedApiGroups={selectedApiGroups}
              onSelectedApiGroupsChange={setSelectedApiGroups}
              apiResourcesData={
                apiResourcesLoaded ? apiResourcesData : { apiGroups: [], resources: [] }
              }
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
            <ResourcesTreeSelect
              selectedResources={selectedResources}
              onSelectedResourcesChange={setSelectedResources}
              apiResourcesData={
                apiResourcesLoaded ? apiResourcesData : { apiGroups: [], resources: [] }
              }
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
