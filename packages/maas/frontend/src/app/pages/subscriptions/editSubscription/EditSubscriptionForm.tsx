import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ActionGroup,
  Alert,
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  NumberInput,
  PageSection,
  Popover,
  TextInput,
  TextArea,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import {
  MultiSelection,
  SelectionOptions,
} from '@odh-dashboard/internal/components/MultiSelection';
import { APIOptions } from 'mod-arch-core';
import { URL_PREFIX } from '~/app/utilities/const';
import { getLowestAvailablePriority } from '~/app/utilities/subscriptions';
import { updateSubscription } from '~/app/api/subscriptions';
import { useSubscriptionModels } from '~/app/hooks/useSubscriptionModels';
import {
  SubscriptionPolicyFormDataResponse,
  SubscriptionInfoResponse,
  SubscriptionModelEntry,
  UpdateSubscriptionRequest,
} from '~/app/types/subscriptions';
import SubscriptionModelsSection from '~/app/pages/subscriptions/viewSubscription/SubscriptionModelsSection';
import AddModelsModal from '~/app/pages/subscriptions/createSubscription/AddModelsModal';
import EditRateLimitsModal from '~/app/pages/subscriptions/createSubscription/EditRateLimitsModal';

type EditSubscriptionFormProps = {
  formData: SubscriptionPolicyFormDataResponse;
  subscriptionInfo: SubscriptionInfoResponse;
};

const buildInitialModels = (info: SubscriptionInfoResponse): SubscriptionModelEntry[] =>
  info.subscription.modelRefs.map((ref) => {
    const summary = info.modelRefs.find(
      (s) => s.name === ref.name && s.namespace === ref.namespace,
    );
    return {
      modelRefSummary: summary ?? {
        name: ref.name,
        namespace: ref.namespace,
        modelRef: { kind: '', name: '' },
      },
      tokenRateLimits: ref.tokenRateLimits,
    };
  });

const EditSubscriptionForm: React.FC<EditSubscriptionFormProps> = ({
  formData,
  subscriptionInfo,
}) => {
  const navigate = useNavigate();
  const { subscription } = subscriptionInfo;

  const [displayName, setDisplayName] = React.useState(subscription.displayName ?? '');
  const [description, setDescription] = React.useState(subscription.description ?? '');
  const [selectedGroups, setSelectedGroups] = React.useState<SelectionOptions[]>(() => {
    const existingGroupNames = new Set(subscription.owner.groups.map((g) => g.name));
    const allGroupNames = new Set([...formData.groups, ...existingGroupNames]);
    return Array.from(allGroupNames).map((group) => ({
      id: group,
      name: group,
      selected: existingGroupNames.has(group),
    }));
  });
  const [groupsTouched, setGroupsTouched] = React.useState(false);
  const [priority, setPriority] = React.useState<number | undefined>(subscription.priority ?? 0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const [initialModels] = React.useState(() => buildInitialModels(subscriptionInfo));

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
  } = useSubscriptionModels(initialModels);

  const initialGroupNames = React.useMemo(
    () => new Set(subscription.owner.groups.map((g) => g.name)),
    [subscription.owner.groups],
  );

  const initialModelKeys = React.useMemo(
    () => new Set(subscription.modelRefs.map((r) => `${r.namespace}/${r.name}`)),
    [subscription.modelRefs],
  );

  const selectedGroupNames = selectedGroups.filter((g) => g.selected).map((g) => String(g.id));
  const groupsValidationError =
    groupsTouched && selectedGroupNames.length === 0
      ? 'At least one group must be selected'
      : undefined;

  const groupsChanged =
    selectedGroupNames.length !== initialGroupNames.size ||
    selectedGroupNames.some((g) => !initialGroupNames.has(g));

  const currentModelKeys = new Set(
    models.map((m) => `${m.modelRefSummary.namespace}/${m.modelRefSummary.name}`),
  );
  const modelsChanged =
    currentModelKeys.size !== initialModelKeys.size ||
    models.some(
      (m) => !initialModelKeys.has(`${m.modelRefSummary.namespace}/${m.modelRefSummary.name}`),
    );

  const showPolicyWarning =
    (groupsChanged || modelsChanged) && subscriptionInfo.authPolicies.length > 0;

  const otherSubscriptions = React.useMemo(
    () => formData.subscriptions.filter((s) => s.name !== subscription.name),
    [formData.subscriptions, subscription.name],
  );

  const conflictingSubscription = React.useMemo(() => {
    if (priority == null || Number.isNaN(priority)) {
      return undefined;
    }
    return otherSubscriptions.find((s) => (s.priority ?? 0) === priority);
  }, [priority, otherSubscriptions]);

  const priorityValidationError = conflictingSubscription
    ? `Priority ${conflictingSubscription.priority ?? 0} is already used by ${conflictingSubscription.displayName || conflictingSubscription.name}. The next available priority is ${getLowestAvailablePriority(formData.subscriptions, (conflictingSubscription.priority ?? 0) + 1)}.`
    : undefined;

  const isPriorityValid = priority != null && !Number.isNaN(priority);
  const isNameValid = displayName.trim().length > 0;

  const canSubmit =
    isNameValid &&
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

    const request: UpdateSubscriptionRequest = {
      displayName: displayName.trim() || undefined,
      description: description.trim() || undefined,
      owner: {
        groups: selectedGroupNames.map((g) => ({ name: g })),
      },
      modelRefs: models.map((m) => ({
        name: m.modelRefSummary.name,
        namespace: m.modelRefSummary.namespace,
        tokenRateLimits: m.tokenRateLimits,
      })),
      priority,
    };

    try {
      const apiOpts: APIOptions = {};
      await updateSubscription()(apiOpts, subscription.name, request);
      navigate(`${URL_PREFIX}/subscriptions/view/${subscription.name}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to update subscription');
      setIsSubmitting(false);
    }
  };

  return (
    <PageSection hasBodyWrapper={false}>
      <Form maxWidth="750px">
        <FormGroup label="Name" fieldId="subscription-name" isRequired>
          <TextInput
            id="subscription-name"
            data-testid="subscription-name"
            value={displayName}
            onChange={(_event, value) => setDisplayName(value)}
          />
        </FormGroup>

        <FormGroup label="Description" fieldId="subscription-description">
          <TextArea
            id="subscription-description"
            data-testid="subscription-description"
            value={description}
            onChange={(_event, value) => setDescription(value)}
            resizeOrientation="vertical"
          />
        </FormGroup>

        <FormGroup
          label="Priority"
          fieldId="subscription-priority"
          isRequired
          labelHelp={
            <Popover bodyContent="Higher numbers rank above lower numbers when resolving defaults across multiple subscriptions.">
              <Button variant="plain" aria-label="Priority help" style={{ padding: 0 }}>
                <OutlinedQuestionCircleIcon />
              </Button>
            </Popover>
          }
        >
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
                  'Higher numbers rank above lower numbers when resolving defaults across multiple subscriptions.'}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

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
            allSubscriptions={otherSubscriptions}
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

        {showPolicyWarning && (
          <Alert
            variant="warning"
            isInline
            title="Authorization policy may need updating"
            data-testid="policy-change-warning"
          >
            This subscription has{' '}
            {subscriptionInfo.authPolicies.length === 1
              ? 'an associated authorization policy'
              : `${subscriptionInfo.authPolicies.length} associated authorization policies`}
            . Changing the groups or models here will not automatically update the{' '}
            {subscriptionInfo.authPolicies.length === 1 ? 'policy' : 'policies'}. You may need to
            update {subscriptionInfo.authPolicies.length === 1 ? 'it' : 'them'} separately on the{' '}
            <Link to={`${URL_PREFIX}/auth-policies`}>Authorization policies page</Link>.
          </Alert>
        )}

        {submitError && (
          <Alert variant="danger" isInline title="Failed to update subscription">
            {submitError}
          </Alert>
        )}

        <ActionGroup>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isDisabled={!canSubmit}
            isLoading={isSubmitting}
            data-testid="update-subscription-button"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
          <Button
            variant="link"
            onClick={() => navigate(`${URL_PREFIX}/subscriptions/view/${subscription.name}`)}
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

export default EditSubscriptionForm;
