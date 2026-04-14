import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionGroup,
  Alert,
  Button,
  Content,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  PageSection,
  Popover,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import {
  MultiSelection,
  SelectionOptions,
} from '@odh-dashboard/internal/components/MultiSelection';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/utils';
import { APIOptions } from 'mod-arch-core';
import AddModelsModal from '~/app/shared/AddModelsModal';
import MaasModelsSection from '~/app/shared/MaasModelsSection';
import { createAuthPolicy, updateAuthPolicy } from '~/app/api/auth-policies';
import type { CreatePolicyRequest, UpdatePolicyRequest } from '~/app/types/auth-policies';
import {
  MaaSAuthPolicy,
  MaaSModelRefSummary,
  SubscriptionPolicyFormDataResponse,
} from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
import { modelRefsToSummaries } from '~/app/utilities/authpolicies';

export type PolicyFormProps = {
  formData: SubscriptionPolicyFormDataResponse;
  initialPolicy?: MaaSAuthPolicy;
};

const PolicyForm: React.FC<PolicyFormProps> = ({ formData, initialPolicy }) => {
  const navigate = useNavigate();
  const { data: nameDescData, onDataChange: onNameDescChange } = useK8sNameDescriptionFieldData(
    initialPolicy
      ? {
          initialData: {
            name: initialPolicy.displayName ?? initialPolicy.name,
            description: initialPolicy.description ?? '',
            k8sName: initialPolicy.name,
          },
        }
      : {},
  );

  const [selectedGroups, setSelectedGroups] = React.useState<SelectionOptions[]>(() => {
    if (initialPolicy) {
      const groupNames = initialPolicy.subjects.groups?.map((g) => g.name) ?? [];
      const allNames = [...new Set([...formData.groups, ...groupNames])];
      return allNames.map((g) => ({ id: g, name: g, selected: groupNames.includes(g) }));
    }
    return formData.groups.map((group) => ({ id: group, name: group, selected: false }));
  });

  const [groupsTouched, setGroupsTouched] = React.useState(false);
  const [selectedModels, setSelectedModels] = React.useState<MaaSModelRefSummary[]>(() =>
    initialPolicy ? modelRefsToSummaries(initialPolicy.modelRefs, formData.modelRefs) : [],
  );
  const [isAddModelsModalOpen, setIsAddModelsModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const isValidK8sNameDescription = isK8sNameDescriptionDataValid(nameDescData);

  const selectedGroupNames = selectedGroups.filter((g) => g.selected).map((g) => String(g.id));
  const groupsValidationError =
    groupsTouched && selectedGroupNames.length === 0
      ? 'At least one group must be selected'
      : undefined;

  const canSubmit =
    isValidK8sNameDescription &&
    selectedGroupNames.length > 0 &&
    selectedModels.length > 0 &&
    !isSubmitting;

  const handleAddModels = (refs: MaaSModelRefSummary[]) => {
    const existingKeys = new Set(selectedModels.map((m) => `${m.namespace}/${m.name}`));
    const newRefs = refs.filter((ref) => !existingKeys.has(`${ref.namespace}/${ref.name}`));
    setSelectedModels((prev) => [...prev, ...newRefs]);
  };

  const handleRemoveModelsByRef = (refs: MaaSModelRefSummary[]) => {
    const removeKeys = new Set(refs.map((r) => `${r.namespace}/${r.name}`));
    setSelectedModels((prev) => prev.filter((m) => !removeKeys.has(`${m.namespace}/${m.name}`)));
  };

  const handleRemoveModelAt = (index: number) => {
    setSelectedModels((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const sharedFields = {
      displayName: nameDescData.name.trim() || undefined,
      description: nameDescData.description.trim() || undefined,
      modelRefs: selectedModels.map((m) => ({ name: m.name, namespace: m.namespace })),
      subjects: { groups: selectedGroupNames.map((n) => ({ name: n })) },
    };

    try {
      const apiOpts: APIOptions = {};
      if (!initialPolicy) {
        const request: CreatePolicyRequest = { name: nameDescData.k8sName.value, ...sharedFields };
        await createAuthPolicy()(apiOpts, request);
      } else {
        const request: UpdatePolicyRequest = sharedFields;
        await updateAuthPolicy(initialPolicy.name)(apiOpts, request);
      }
      navigate(`${URL_PREFIX}/auth-policies`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save policy');
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryLabel = initialPolicy ? 'Save changes' : 'Create policy';
  const primaryLoadingLabel = initialPolicy ? 'Saving...' : 'Creating...';

  return (
    <PageSection hasBodyWrapper={false}>
      <Form maxWidth="750px">
        <K8sNameDescriptionField
          data={nameDescData}
          onDataChange={onNameDescChange}
          dataTestId="policy-name-desc"
        />

        <FormGroup
          label="Groups"
          fieldId="policy-groups"
          isRequired
          labelHelp={
            <Popover bodyContent="Select existing groups from the list, or type the name of an OpenID Connect (OIDC) group and press Enter to add it. Groups correspond to OIDC group claims from your identity provider. Any group name that matches an OIDC group claim can be used, even if it does not appear in the list.">
              <Button variant="plain" aria-label="Groups help" className="pf-v6-u-p-0">
                <OutlinedQuestionCircleIcon />
              </Button>
            </Popover>
          }
        >
          <MultiSelection
            ariaLabel="Select groups or type to add a new group"
            value={selectedGroups}
            setValue={(newValue) => {
              setGroupsTouched(true);
              setSelectedGroups(newValue);
            }}
            toggleTestId="policy-groups"
            isCreatable
            createOptionMessage={(value) => `Add group "${value}"`}
            placeholder="Select groups or type to add a new group"
            selectionRequired={groupsTouched}
            noSelectedOptionsMessage="One or more groups must be selected"
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant={groupsValidationError ? 'error' : 'default'}>
                {groupsValidationError ||
                  'Select groups that will be able to access this policy. You can also add the name of an OIDC group.'}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

        {formData.modelRefs.length === 0 ? (
          <Alert
            variant="warning"
            isInline
            title="No models available"
            data-testid="policy-no-models-warning"
          >
            There are no model endpoints available on the cluster. Deploy a model and create a
            MaaSModelRef before creating a policy.
          </Alert>
        ) : (
          <>
            <MaasModelsSection
              modelRefSummaries={selectedModels}
              hideColumns={['tokenLimits']}
              editable
              onAddModels={() => setIsAddModelsModalOpen(true)}
              onRemoveModel={handleRemoveModelAt}
              helperText={
                <Content>
                  Add models that subjects of this policy will be granted access to.
                </Content>
              }
              formGroupFieldId="policy-models"
              sectionTestId="policy-models-section"
              tableTestId="policy-models-table"
              tableAriaLabel="Policy models"
              addModelsButtonTestId="policy-add-models-button"
              addModelsButtonAriaLabel="Add models to policy"
            />
            {isAddModelsModalOpen && (
              <AddModelsModal
                modalSource="policy"
                availableModelRefs={formData.modelRefs}
                allSubscriptions={formData.subscriptions}
                allPolicies={formData.policies}
                currentModels={selectedModels.map((m) => ({ modelRefSummary: m }))}
                onAdd={handleAddModels}
                onRemove={handleRemoveModelsByRef}
                onClose={() => setIsAddModelsModalOpen(false)}
                ariaLabel="Add models to policy"
                title="Add models to policy"
                description="Select model endpoints to grant access to through this policy."
              />
            )}
          </>
        )}

        {submitError && (
          <Alert variant="danger" isInline title="Failed to save policy">
            {submitError}
          </Alert>
        )}

        <ActionGroup>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isDisabled={!canSubmit}
            isLoading={isSubmitting}
            data-testid="policy-submit-button"
          >
            {isSubmitting ? primaryLoadingLabel : primaryLabel}
          </Button>
          <Button
            variant="link"
            onClick={() => navigate(`${URL_PREFIX}/auth-policies`)}
            isDisabled={isSubmitting}
            data-testid="policy-cancel-button"
          >
            Cancel
          </Button>
        </ActionGroup>
      </Form>
    </PageSection>
  );
};

export default PolicyForm;
