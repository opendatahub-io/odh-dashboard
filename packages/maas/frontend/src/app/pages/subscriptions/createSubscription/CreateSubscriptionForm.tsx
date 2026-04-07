import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ActionGroup,
  Alert,
  Button,
  Checkbox,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  NumberInput,
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
import { URL_PREFIX } from '~/app/utilities/const';
import { getLowestAvailablePriority } from '~/app/utilities/subscriptions';
import { createSubscription } from '~/app/api/subscriptions';
import { useSubscriptionModels } from '~/app/hooks/useSubscriptionModels';
import {
  SubscriptionPolicyFormDataResponse,
  CreateSubscriptionRequest,
} from '~/app/types/subscriptions';
import SubscriptionModelsSection from '~/app/pages/subscriptions/viewSubscription/SubscriptionModelsSection';
import AddModelsModal from './AddModelsModal';
import EditRateLimitsModal from './EditRateLimitsModal';

type CreateSubscriptionFormProps = {
  formData: SubscriptionPolicyFormDataResponse;
};

const CreateSubscriptionForm: React.FC<CreateSubscriptionFormProps> = ({ formData }) => {
  const navigate = useNavigate();

  const { data: nameDescData, onDataChange: onNameDescChange } = useK8sNameDescriptionFieldData();
  const [selectedGroups, setSelectedGroups] = React.useState<SelectionOptions[]>([]);
  const [groupsTouched, setGroupsTouched] = React.useState(false);
  const [priority, setPriority] = React.useState<number | undefined>(undefined);
  const [priorityInitialized, setPriorityInitialized] = React.useState(false);
  const [createAuthPolicy, setCreateAuthPolicy] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    models,
    isAddModelsModalOpen,
    setIsAddModelsModalOpen,
    editLimitsTarget,
    setEditLimitsTarget,
    editingModel,
    rateLimitErrorIndices,
    allModelsHaveRateLimits,
    handleAddModels,
    handleRemoveModel,
    handleRemoveModelsByRef,
    handleSaveRateLimits,
    handleCloseRateLimitsModal,
  } = useSubscriptionModels();

  React.useEffect(() => {
    if (formData.groups.length > 0 && selectedGroups.length === 0) {
      setSelectedGroups(
        formData.groups.map((group) => ({
          id: group,
          name: group,
          selected: false,
        })),
      );
    }
  }, [formData.groups, selectedGroups.length]);

  React.useEffect(() => {
    if (!priorityInitialized) {
      setPriority(getLowestAvailablePriority(formData.subscriptions));
      setPriorityInitialized(true);
    }
  }, [formData.subscriptions, priorityInitialized]);

  const isNameDescValid = isK8sNameDescriptionDataValid(nameDescData);

  const selectedGroupNames = selectedGroups.filter((g) => g.selected).map((g) => String(g.id));
  const groupsValidationError =
    groupsTouched && selectedGroupNames.length === 0
      ? 'At least one group must be selected'
      : undefined;

  const conflictingSubscription = React.useMemo(() => {
    if (priority == null || Number.isNaN(priority)) {
      return undefined;
    }
    return formData.subscriptions.find((s) => (s.priority ?? 0) === priority);
  }, [priority, formData.subscriptions]);

  const priorityValidationError = conflictingSubscription
    ? `Priority ${conflictingSubscription.priority ?? 0} is already used by ${conflictingSubscription.displayName || conflictingSubscription.name}. The next available priority is ${getLowestAvailablePriority(formData.subscriptions, (conflictingSubscription.priority ?? 0) + 1)}.`
    : undefined;

  const isPriorityValid = priority != null && !Number.isNaN(priority);

  const canSubmit =
    isNameDescValid &&
    selectedGroupNames.length > 0 &&
    models.length > 0 &&
    allModelsHaveRateLimits &&
    isPriorityValid &&
    !isSubmitting &&
    !priorityValidationError;

  const handleSubmit = async () => {
    if (!isPriorityValid) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const request: CreateSubscriptionRequest = {
      name: nameDescData.k8sName.value,
      displayName: nameDescData.name.trim() || undefined,
      description: nameDescData.description.trim() || undefined,
      owner: {
        groups: selectedGroupNames.map((g) => ({ name: g })),
      },
      modelRefs: models.map((m) => ({
        name: m.modelRefSummary.name,
        namespace: m.modelRefSummary.namespace,
        tokenRateLimits: m.tokenRateLimits,
      })),
      priority,
      createAuthPolicy,
    };

    try {
      const apiOpts: APIOptions = {};
      await createSubscription()(apiOpts, request);
      navigate(`${URL_PREFIX}/subscriptions`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to create subscription');
      setIsSubmitting(false);
    }
  };

  return (
    <PageSection hasBodyWrapper={false}>
      <Form maxWidth="750px">
        <K8sNameDescriptionField
          data={nameDescData}
          onDataChange={onNameDescChange}
          dataTestId="subscription-name-desc"
        />

        <FormGroup
          label="Groups"
          fieldId="subscription-groups"
          isRequired
          labelHelp={
            <Popover bodyContent="Select groups that will be able to access this subscription. You can also add the name of an OIDC group.">
              <Button variant="plain" aria-label="Groups help" style={{ padding: 0 }}>
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
            toggleTestId="subscription-groups"
            isCreatable
            createOptionMessage={(value) => `Add group "${value}"`}
            placeholder="Select groups or type to add a new group"
            selectionRequired={groupsTouched}
            noSelectedOptionsMessage="One or more groups must be selected"
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                {groupsValidationError ||
                  'Select groups that will be able to access this subscription. You can also add the name of an OIDC group.'}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

        <FormGroup label="Priority level" fieldId="subscription-priority">
          <NumberInput
            id="subscription-priority"
            data-testid="subscription-priority"
            value={priority == null || Number.isNaN(priority) ? '' : priority}
            min={0}
            max={2147483647}
            onMinus={() =>
              setPriority(
                Math.max(0, (priority == null || Number.isNaN(priority) ? 0 : priority) - 1),
              )
            }
            onPlus={() =>
              setPriority(
                Math.min(
                  2147483647,
                  (priority == null || Number.isNaN(priority) ? 0 : priority) + 1,
                ),
              )
            }
            onChange={(event: React.FormEvent<HTMLInputElement>) => {
              const inputValue = event.currentTarget.value;
              if (inputValue === '') {
                setPriority(NaN);
              } else {
                const parsed = parseInt(inputValue, 10);
                if (!Number.isNaN(parsed)) {
                  setPriority(Math.min(2147483647, Math.max(0, parsed)));
                }
              }
            }}
            validated={priorityValidationError ? 'error' : 'default'}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant={priorityValidationError ? 'error' : 'default'}>
                {priorityValidationError ||
                  'Higher numbers indicate higher priority. Users with access to multiple subscriptions will use the highest priority subscription available to them.'}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

        {formData.modelRefs.length === 0 ? (
          <Alert
            variant="warning"
            isInline
            title="No models available"
            data-testid="no-models-warning"
          >
            There are no model endpoints available on the cluster. Deploy a model on the{' '}
            <Link to={`${URL_PREFIX}/deployments`}>Deployments page</Link> and create a MaaSModelRef
            before creating a subscription.
          </Alert>
        ) : (
          <SubscriptionModelsSection
            modelRefSummaries={models.map((m) => m.modelRefSummary)}
            subscriptionModelRefs={models.map((m) => ({
              name: m.modelRefSummary.name,
              namespace: m.modelRefSummary.namespace,
              tokenRateLimits: m.tokenRateLimits,
            }))}
            editable
            rateLimitErrorIndices={rateLimitErrorIndices}
            onAddModels={() => setIsAddModelsModalOpen(true)}
            onEditLimits={(index) => setEditLimitsTarget(index)}
            onRemoveModel={handleRemoveModel}
          />
        )}

        {isAddModelsModalOpen && (
          <AddModelsModal
            availableModelRefs={formData.modelRefs}
            allSubscriptions={formData.subscriptions}
            allPolicies={formData.policies}
            currentModels={models}
            onAdd={handleAddModels}
            onRemove={handleRemoveModelsByRef}
            onClose={() => setIsAddModelsModalOpen(false)}
          />
        )}

        {editLimitsTarget != null && editingModel && (
          <EditRateLimitsModal
            modelName={
              editingModel.modelRefSummary.displayName ?? editingModel.modelRefSummary.name
            }
            rateLimits={editingModel.tokenRateLimits}
            onSave={handleSaveRateLimits}
            onClose={handleCloseRateLimitsModal}
          />
        )}

        <FormGroup fieldId="subscription-create-auth-policy">
          <Checkbox
            id="subscription-create-auth-policy"
            data-testid="subscription-create-auth-policy"
            label={
              <>
                Create a matching authorization policy{' '}
                <Popover
                  headerContent="Why create a policy?"
                  bodyContent={
                    <>
                      <p>
                        A <b>subscription</b> (MaaSSubscription) defines which models should be
                        available to certain groups on request, but it does not grant access to
                        those models on its own.
                      </p>
                      <br />
                      <p>
                        A <b>policy</b> (MaaSAuthPolicy) is a separate resource that authorizes
                        specific groups to be able to access model endpoints through the API
                        gateway.
                      </p>
                      <br />
                      <p>
                        Both resources are needed in order to consume model endpoints through the
                        API gateway.
                      </p>
                    </>
                  }
                >
                  <Button variant="plain" aria-label="Auth policy help" style={{ padding: 0 }}>
                    <OutlinedQuestionCircleIcon />
                  </Button>
                </Popover>
              </>
            }
            isChecked={createAuthPolicy}
            onChange={(_event, checked) => setCreateAuthPolicy(checked)}
          />
        </FormGroup>

        {submitError && (
          <Alert variant="danger" isInline title="Failed to create subscription">
            {submitError}
          </Alert>
        )}

        <ActionGroup>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isDisabled={!canSubmit}
            isLoading={isSubmitting}
            data-testid="create-subscription-button"
          >
            {isSubmitting ? 'Creating...' : 'Create subscription'}
          </Button>
          <Button
            variant="link"
            onClick={() => navigate(`${URL_PREFIX}/subscriptions`)}
            isDisabled={isSubmitting}
            data-testid="cancel-subscription-button"
          >
            Cancel
          </Button>
        </ActionGroup>
      </Form>
    </PageSection>
  );
};

export default CreateSubscriptionForm;
