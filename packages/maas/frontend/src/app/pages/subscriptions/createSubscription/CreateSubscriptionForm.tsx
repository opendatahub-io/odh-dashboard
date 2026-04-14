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
import { createSubscription, updateSubscription } from '~/app/api/subscriptions';
import { useSubscriptionModels } from '~/app/hooks/useSubscriptionModels';
import {
  SubscriptionPolicyFormDataResponse,
  SubscriptionInfoResponse,
  SubscriptionModelEntry,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
} from '~/app/types/subscriptions';
import AddModelsModal from '~/app/shared/AddModelsModal';
import MaasModelsSection from '~/app/shared/MaasModelsSection';
import EditRateLimitsModal from './EditRateLimitsModal';

type CreateSubscriptionFormProps = {
  formData: SubscriptionPolicyFormDataResponse;
  subscriptionInfo?: SubscriptionInfoResponse;
};
const MAX_PRIORITY = 1000000;
const MIN_PRIORITY = -1000000;

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

const CreateSubscriptionForm: React.FC<CreateSubscriptionFormProps> = ({
  formData,
  subscriptionInfo,
}) => {
  const navigate = useNavigate();
  const isEditing = !!subscriptionInfo;
  const subscription = subscriptionInfo?.subscription;

  const { data: nameDescData, onDataChange: onNameDescChange } = useK8sNameDescriptionFieldData(
    subscription
      ? {
          initialData: {
            name: subscription.displayName ?? subscription.name,
            k8sName: subscription.name,
            description: subscription.description ?? '',
          },
        }
      : undefined,
  );

  const [selectedGroups, setSelectedGroups] = React.useState<SelectionOptions[]>(() => {
    if (subscription) {
      const existingGroupNames = new Set(subscription.owner.groups.map((g) => g.name));
      const allGroupNames = new Set([...formData.groups, ...existingGroupNames]);
      return Array.from(allGroupNames).map((group) => ({
        id: group,
        name: group,
        selected: existingGroupNames.has(group),
      }));
    }
    return [];
  });
  const [groupsTouched, setGroupsTouched] = React.useState(false);
  const [priority, setPriority] = React.useState<number | undefined>(
    subscription?.priority ?? undefined,
  );
  const [priorityInitialized, setPriorityInitialized] = React.useState(isEditing);
  const [createAuthPolicy, setCreateAuthPolicy] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const [initialModels] = React.useState(() =>
    subscriptionInfo ? buildInitialModels(subscriptionInfo) : [],
  );

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

  React.useEffect(() => {
    if (!isEditing && formData.groups.length > 0 && selectedGroups.length === 0) {
      setSelectedGroups(
        formData.groups.map((group) => ({
          id: group,
          name: group,
          selected: false,
        })),
      );
    }
  }, [formData.groups, selectedGroups.length, isEditing]);

  React.useEffect(() => {
    if (!priorityInitialized) {
      setPriority(getLowestAvailablePriority(formData.subscriptions));
      setPriorityInitialized(true);
    }
  }, [formData.subscriptions, priorityInitialized]);

  const isNameValid = isK8sNameDescriptionDataValid(nameDescData);

  const selectedGroupNames = selectedGroups.filter((g) => g.selected).map((g) => String(g.id));
  const groupsValidationError =
    groupsTouched && selectedGroupNames.length === 0
      ? 'At least one group must be selected'
      : undefined;

  const initialGroupNames = React.useMemo(
    () =>
      subscription ? new Set(subscription.owner.groups.map((g) => g.name)) : new Set<string>(),
    [subscription],
  );

  const initialModelKeys = React.useMemo(
    () =>
      subscription
        ? new Set(subscription.modelRefs.map((r) => `${r.namespace}/${r.name}`))
        : new Set<string>(),
    [subscription],
  );

  const groupsChanged =
    isEditing &&
    (selectedGroupNames.length !== initialGroupNames.size ||
      selectedGroupNames.some((g) => !initialGroupNames.has(g)));

  const currentModelKeys = new Set(
    models.map((m) => `${m.modelRefSummary.namespace}/${m.modelRefSummary.name}`),
  );
  const modelsChanged =
    isEditing &&
    (currentModelKeys.size !== initialModelKeys.size ||
      models.some(
        (m) => !initialModelKeys.has(`${m.modelRefSummary.namespace}/${m.modelRefSummary.name}`),
      ));

  const showPolicyWarning = isEditing && (groupsChanged || modelsChanged);

  const subscriptionsForConflictCheck = React.useMemo(
    () =>
      isEditing && subscription
        ? formData.subscriptions.filter((s) => s.name !== subscription.name)
        : formData.subscriptions,
    [formData.subscriptions, subscription, isEditing],
  );

  const conflictingSubscription = React.useMemo(() => {
    if (priority == null || Number.isNaN(priority)) {
      return undefined;
    }
    return subscriptionsForConflictCheck.find((s) => (s.priority ?? 0) === priority);
  }, [priority, subscriptionsForConflictCheck]);

  const priorityValidationError = conflictingSubscription
    ? `Priority ${conflictingSubscription.priority ?? 0} is already used by ${conflictingSubscription.displayName || conflictingSubscription.name}. The next available priority is ${getLowestAvailablePriority(subscriptionsForConflictCheck, (conflictingSubscription.priority ?? 0) + 1)}.`
    : undefined;

  const isPriorityValid = priority != null && !Number.isNaN(priority);

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

    const modelRefsPayload = models.map((m) => ({
      name: m.modelRefSummary.name,
      namespace: m.modelRefSummary.namespace,
      tokenRateLimits: m.tokenRateLimits,
    }));

    try {
      const apiOpts: APIOptions = {};
      if (isEditing && subscription) {
        const trimmedName = nameDescData.name.trim();
        const originalName = subscription.displayName ?? subscription.name;
        const request: UpdateSubscriptionRequest = {
          displayName:
            trimmedName !== originalName ? trimmedName || undefined : subscription.displayName,
          description: nameDescData.description.trim() || undefined,
          owner: { groups: selectedGroupNames.map((g) => ({ name: g })) },
          modelRefs: modelRefsPayload,
          priority,
        };
        await updateSubscription()(apiOpts, subscription.name, request);
      } else {
        const request: CreateSubscriptionRequest = {
          name: nameDescData.k8sName.value,
          displayName: nameDescData.name.trim() || undefined,
          description: nameDescData.description.trim() || undefined,
          owner: { groups: selectedGroupNames.map((g) => ({ name: g })) },
          modelRefs: modelRefsPayload,
          priority,
          createAuthPolicy,
        };
        await createSubscription()(apiOpts, request);
      }
      navigate(`${URL_PREFIX}/subscriptions`);
    } catch (e) {
      setSubmitError(
        e instanceof Error
          ? e.message
          : `Failed to ${isEditing ? 'update' : 'create'} subscription`,
      );
      setIsSubmitting(false);
    }
  };

  const showNoModelsWarning = !isEditing && formData.modelRefs.length === 0 && models.length === 0;
  const canAddModels = formData.modelRefs.length > 0;

  return (
    <PageSection hasBodyWrapper={false}>
      <Form maxWidth="750px">
        <K8sNameDescriptionField
          data={nameDescData}
          onDataChange={onNameDescChange}
          dataTestId="subscription-name-desc"
        />

        <FormGroup label="Priority" fieldId="subscription-priority">
          <NumberInput
            id="subscription-priority"
            data-testid="subscription-priority"
            value={priority == null || Number.isNaN(priority) ? '' : priority}
            min={MIN_PRIORITY}
            max={MAX_PRIORITY}
            onMinus={() =>
              setPriority(
                Math.max(
                  MIN_PRIORITY,
                  (priority == null || Number.isNaN(priority) ? 0 : priority) - 1,
                ),
              )
            }
            onPlus={() =>
              setPriority(
                Math.min(
                  MAX_PRIORITY,
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
                  setPriority(Math.min(MAX_PRIORITY, Math.max(MIN_PRIORITY, parsed)));
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

        {showNoModelsWarning ? (
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
          <MaasModelsSection
            modelRefSummaries={models.map((m) => m.modelRefSummary)}
            modelRefsWithRateLimits={models.map((m) => ({
              name: m.modelRefSummary.name,
              namespace: m.modelRefSummary.namespace,
              tokenRateLimits: m.tokenRateLimits,
            }))}
            editable
            rateLimitErrorIndices={rateLimitErrorIndices}
            onAddModels={canAddModels ? () => setIsAddModelsModalOpen(true) : undefined}
            onEditLimits={(index) => setEditLimitsTarget(index)}
            onRemoveModel={handleRemoveModel}
          />
        )}

        {isAddModelsModalOpen && canAddModels && (
          <AddModelsModal
            modalSource="subscription"
            availableModelRefs={formData.modelRefs}
            allSubscriptions={subscriptionsForConflictCheck}
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

        {!isEditing && (
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
        )}

        {showPolicyWarning && (
          <Alert
            variant="warning"
            isInline
            title="Authorization policy may need updating"
            data-testid="policy-change-warning"
          >
            You may have an associated authorization policy. Changing the groups or models here will
            not automatically update it. You may need to update it separately on the{' '}
            <Link to={`${URL_PREFIX}/auth-policies`}>Authorization policies page</Link>.
          </Alert>
        )}

        {submitError && (
          <Alert
            variant="danger"
            isInline
            title={`Failed to ${isEditing ? 'update' : 'create'} subscription`}
          >
            {submitError}
          </Alert>
        )}

        <ActionGroup>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isDisabled={!canSubmit}
            isLoading={isSubmitting}
            data-testid={isEditing ? 'update-subscription-button' : 'create-subscription-button'}
          >
            {isEditing
              ? isSubmitting
                ? 'Saving...'
                : 'Save'
              : isSubmitting
                ? 'Creating...'
                : 'Create subscription'}
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
