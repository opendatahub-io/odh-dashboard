import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ActionGroup,
  Alert,
  AlertActionLink,
  Button,
  Checkbox,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  PageSection,
  Popover,
} from '@patternfly/react-core';
import { MultiSelection, SelectionOptions } from '@odh-dashboard/ui-core/components/MultiSelection';
import NumberInputWrapper from '@odh-dashboard/ui-core/components/NumberInputWrapper';
import FieldGroupHelpLabelIcon from '@odh-dashboard/ui-core/components/FieldGroupHelpLabelIcon';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
} from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import { isK8sNameDescriptionDataValid } from '@odh-dashboard/k8s-core';
import { useZodFormValidation } from '@odh-dashboard/ui-core/hooks/useZodFormValidation';
import { APIOptions } from 'mod-arch-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { z } from 'zod';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { getSectionUrl } from '~/app/utilities/maasGovernanceNavigation';
import { createSubscription, updateSubscription } from '~/app/api/subscriptions';
import { useMaaSGovernanceContext } from '~/app/context/MaaSGovernanceContext';
import { useSubscriptionModels } from '~/app/hooks/useSubscriptionModels';
import {
  MaaSAuthPolicy,
  MaaSModelRefSummary,
  MaaSSubscription,
  SubscriptionInfoResponse,
  SubscriptionModelEntry,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  SYSTEM_AUTHENTICATED_GROUP,
} from '~/app/types/subscriptions';
import AddModelsModal from '~/app/shared/AddModelsModal';
import MaasModelsSection from '~/app/shared/MaasModelsSection';
import {
  EventTrackingEditSource,
  EventTrackingPrefillSource,
  MaaSEvents,
  SubscriptionCreatedCancelProperties,
  SubscriptionCreatedErrorProperties,
  SubscriptionCreatedSuccessProperties,
  SubscriptionUpdatedCancelProperties,
  SubscriptionUpdatedErrorProperties,
  SubscriptionUpdatedSuccessProperties,
} from '~/app/types/event-tracking';
import SystemAuthenticatedWarning from '~/app/shared/SystemAuthenticatedWarning';
import { hasInternalModelKind } from '~/app/utilities/subscriptions';
import EditRateLimitsModal from './EditRateLimitsModal';

const INFERENCE_PRIORITY_HELP = (
  <>
    <p>
      Controls the scheduling priority for inference requests made under internal models in this
      subscription. Higher values mean requests are scheduled first, while negative values place
      requests below the default priority.
    </p>
    <br />
    <p>This field is optional. If left unset, requests use the default priority.</p>
  </>
);

type CreateSubscriptionFormProps = {
  groups: string[];
  modelRefs: MaaSModelRefSummary[];
  subscriptions: MaaSSubscription[];
  policies: MaaSAuthPolicy[];
  subscriptionInfo?: SubscriptionInfoResponse;
  returnTo?: string;
  preSelectedModel?: { name: string; namespace?: string };
  editSource?: EventTrackingEditSource;
};
const MAX_PRIORITY = 2147483647;
const MIN_PRIORITY = -2147483648;

const SUBSCRIPTION_CONFLICT_MESSAGE =
  'This subscription was modified by someone else. Refresh the page and try again.';

const isSubscriptionConflictError = (message: string): boolean =>
  message.includes('modified by someone else') ||
  message.includes('Operation cannot be fulfilled') ||
  message.includes('the object has been modified');

const getSubscriptionSubmitError = (error: unknown, editing: boolean): string => {
  if (error instanceof Error) {
    if (editing && isSubscriptionConflictError(error.message)) {
      return SUBSCRIPTION_CONFLICT_MESSAGE;
    }
    return error.message;
  }
  return `Failed to ${editing ? 'update' : 'create'} subscription`;
};

const subscriptionFormSchema = z.object({
  inferencePriority: z
    .number()
    .int('Inference priority must be a whole number')
    .min(MIN_PRIORITY, `Inference priority must be at least ${MIN_PRIORITY}`)
    .max(MAX_PRIORITY, `Inference priority must be at most ${MAX_PRIORITY}`)
    .optional(),
  groups: z.array(z.string()).min(1, 'One or more groups must be selected'),
  models: z.array(z.unknown()).min(1, 'One or more models must be added'),
});

type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

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
  groups,
  modelRefs,
  subscriptions,
  policies,
  subscriptionInfo,
  returnTo,
  preSelectedModel,
  editSource,
}) => {
  const navigate = useNavigate();
  const { refresh } = useMaaSGovernanceContext();
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
      const allGroupNames = new Set([...groups, ...existingGroupNames]);
      return Array.from(allGroupNames).map((group) => ({
        id: group,
        name: group,
        selected: existingGroupNames.has(group),
      }));
    }
    return groups.map((group) => ({
      id: group,
      name: group,
      selected: false,
    }));
  });
  const [groupsTouched, setGroupsTouched] = React.useState(false);
  const [modelsTouched, setModelsTouched] = React.useState(false);
  const [inferencePriority, setInferencePriority] = React.useState<number | undefined>(
    subscription?.inferencePriority,
  );
  const [createAuthPolicy, setCreateAuthPolicy] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const [initialModels] = React.useState<SubscriptionModelEntry[]>(() => {
    if (subscriptionInfo) {
      return buildInitialModels(subscriptionInfo);
    }
    if (preSelectedModel) {
      const match = modelRefs.find(
        (m) =>
          m.name === preSelectedModel.name &&
          (!preSelectedModel.namespace || m.namespace === preSelectedModel.namespace),
      );
      if (match) {
        return [{ modelRefSummary: match, tokenRateLimits: [] }];
      }
    }
    return [];
  });

  const {
    models,
    isAddModelsModalOpen,
    setIsAddModelsModalOpen,
    editLimitsTarget,
    setEditLimitsTarget,
    editingModel,
    allModelsHaveRateLimits,
    handleAddModels,
    handleRemoveModel,
    handleRemoveModelsByRef,
    handleSaveRateLimits,
    handleCloseRateLimitsModal,
  } = useSubscriptionModels(initialModels);

  const isNameValid = isK8sNameDescriptionDataValid(nameDescData);

  const selectedGroupNames = selectedGroups.filter((g) => g.selected).map((g) => String(g.id));

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
        ? subscriptions.filter((s) => s.name !== subscription.name)
        : subscriptions,
    [subscriptions, subscription, isEditing],
  );

  const hasInternalModel = hasInternalModelKind(models.map((m) => m.modelRefSummary));
  const effectiveInferencePriority = hasInternalModel ? inferencePriority : undefined;

  const clearInferencePriorityIfNoInternalModels = (remaining: SubscriptionModelEntry[]) => {
    if (!hasInternalModelKind(remaining.map((m) => m.modelRefSummary))) {
      setInferencePriority(undefined);
    }
  };

  const zodFormData: SubscriptionFormData = React.useMemo(
    () => ({
      inferencePriority: effectiveInferencePriority,
      groups: selectedGroupNames,
      models,
    }),
    [effectiveInferencePriority, selectedGroupNames, models],
  );

  const { getFieldValidation } = useZodFormValidation(zodFormData, subscriptionFormSchema);

  const canSubmit =
    isNameValid &&
    getFieldValidation(undefined, true).length === 0 &&
    allModelsHaveRateLimits &&
    !isSubmitting;

  const modelRefsPayload = models.map((m) => ({
    name: m.modelRefSummary.name,
    namespace: m.modelRefSummary.namespace,
    tokenRateLimits: m.tokenRateLimits,
  }));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

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
          inferencePriority: effectiveInferencePriority,
          resourceVersion: subscription.resourceVersion,
        };
        await updateSubscription()(apiOpts, subscription.name, request);
        fireFormTrackingEvent(MaaSEvents.SUBSCRIPTION_UPDATED, {
          outcome: TrackingOutcome.submit,
          success: true,
          groupCount: selectedGroupNames.length,
          modelCount: models.length,
          hasDescription: nameDescData.description.trim() !== '',
          priority: effectiveInferencePriority,
          editSource,
        } satisfies SubscriptionUpdatedSuccessProperties);
      } else {
        const request: CreateSubscriptionRequest = {
          name: nameDescData.k8sName.value,
          displayName: nameDescData.name.trim() || undefined,
          description: nameDescData.description.trim() || undefined,
          owner: { groups: selectedGroupNames.map((g) => ({ name: g })) },
          modelRefs: modelRefsPayload,
          inferencePriority: effectiveInferencePriority,
          createAuthPolicy,
        };
        await createSubscription()(apiOpts, request);
        fireFormTrackingEvent(MaaSEvents.SUBSCRIPTION_CREATED, {
          outcome: TrackingOutcome.submit,
          success: true,
          groupCount: selectedGroupNames.length,
          modelCount: models.length,
          hasDescription: nameDescData.description.trim() !== '',
          modelCountAvailable: modelRefs.length,
          hasMatchingPolicy: createAuthPolicy,
          priority: effectiveInferencePriority,
          prefillSource,
        } satisfies SubscriptionCreatedSuccessProperties);
      }
      refresh();
      navigate(returnTo ?? getSectionUrl('subscriptions'));
    } catch (e) {
      const errMsg = getSubscriptionSubmitError(e, isEditing);
      fireFormTrackingEvent(
        isEditing ? MaaSEvents.SUBSCRIPTION_UPDATED : MaaSEvents.SUBSCRIPTION_CREATED,
        isEditing
          ? ({
              outcome: TrackingOutcome.submit,
              success: false,
              editSource,
            } satisfies SubscriptionUpdatedErrorProperties)
          : ({
              outcome: TrackingOutcome.submit,
              success: false,
            } satisfies SubscriptionCreatedErrorProperties),
      );
      setSubmitError(errMsg);
      setIsSubmitting(false);
    }
  };

  const showNoModelsWarning = !isEditing && modelRefs.length === 0 && models.length === 0;
  const canAddModels = modelRefs.length > 0;

  const prefillSource = preSelectedModel
    ? EventTrackingPrefillSource.MODEL
    : EventTrackingPrefillSource.NONE;

  return (
    <PageSection hasBodyWrapper={false}>
      <Form maxWidth="750px">
        <K8sNameDescriptionField
          data={nameDescData}
          onDataChange={onNameDescChange}
          dataTestId="subscription-name-desc"
        />

        <FormGroup label="Groups" fieldId="subscription-groups" isRequired>
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Select user groups that can access models in this subscription.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
          <MultiSelection
            ariaLabel="Select groups"
            value={selectedGroups}
            setValue={(newValue) => {
              setGroupsTouched(true);
              setSelectedGroups(newValue);
            }}
            toggleTestId="subscription-groups"
            isCreatable
            createOptionMessage={(value) => `Add group "${value}"`}
            placeholder="Select groups"
          />
          {selectedGroupNames.includes(SYSTEM_AUTHENTICATED_GROUP) && (
            <SystemAuthenticatedWarning />
          )}
          {groupsTouched && getFieldValidation(['groups'], true).length > 0 && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="error">
                  {getFieldValidation(['groups'], true)[0].message}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
        </FormGroup>

        {showNoModelsWarning ? (
          <Alert
            variant="warning"
            isInline
            title="No models available"
            data-testid="no-models-warning"
          >
            There are no model endpoints available on the cluster. To create a subscription, first
            deploy a model from the <Link to="/ai-hub/models/deployments">Deployments page</Link>{' '}
            and create a MaaSModelRef.
          </Alert>
        ) : (
          <>
            <MaasModelsSection
              modelRefSummaries={models.map((m) => m.modelRefSummary)}
              modelRefsWithRateLimits={models.map((m) => ({
                name: m.modelRefSummary.name,
                namespace: m.modelRefSummary.namespace,
                tokenRateLimits: m.tokenRateLimits,
              }))}
              hideColumns={['status']}
              editable
              onAddModels={canAddModels ? () => setIsAddModelsModalOpen(true) : undefined}
              onEditLimits={(index) => setEditLimitsTarget(index)}
              onRemoveModel={(index) => {
                setModelsTouched(true);
                clearInferencePriorityIfNoInternalModels(models.filter((_, i) => i !== index));
                handleRemoveModel(index);
              }}
              validationError={
                modelsTouched && getFieldValidation(['models'], true).length > 0
                  ? getFieldValidation(['models'], true)[0].message
                  : undefined
              }
              resourceType="subscription"
            />
            {hasInternalModel ? (
              <FormGroup
                label="Inference priority"
                fieldId="subscription-inference-priority"
                labelHelp={
                  <FieldGroupHelpLabelIcon
                    title="Inference priority"
                    content={INFERENCE_PRIORITY_HELP}
                    buttonTestId="subscription-inference-priority-help"
                    popoverBodyTestId="subscription-inference-priority-help-popover"
                  />
                }
              >
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant="default">
                      When capacity is limited, higher priority values are scheduled for inference
                      first. Applies only to internal models in this subscription. External models
                      are not affected.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
                <NumberInputWrapper
                  id="subscription-inference-priority"
                  data-testid="subscription-inference-priority"
                  value={
                    inferencePriority == null || Number.isNaN(inferencePriority)
                      ? ''
                      : inferencePriority
                  }
                  min={MIN_PRIORITY}
                  max={MAX_PRIORITY}
                  onChange={(newValue) => setInferencePriority(newValue)}
                />
              </FormGroup>
            ) : null}
          </>
        )}

        {isAddModelsModalOpen && canAddModels && (
          <AddModelsModal
            modalSource="subscription"
            availableModelRefs={modelRefs}
            allSubscriptions={subscriptionsForConflictCheck}
            allPolicies={policies}
            currentModels={models}
            onAdd={(refs) => {
              setModelsTouched(true);
              handleAddModels(refs);
            }}
            onRemove={(refs) => {
              setModelsTouched(true);
              const keysToRemove = new Set(refs.map((r) => `${r.namespace}/${r.name}`));
              clearInferencePriorityIfNoInternalModels(
                models.filter(
                  (m) =>
                    !keysToRemove.has(`${m.modelRefSummary.namespace}/${m.modelRefSummary.name}`),
                ),
              );
              handleRemoveModelsByRef(refs);
            }}
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
          <FormGroup fieldId="subscription-create-auth-policy" label="Authorization policy">
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  To consume model endpoints through the API gateway, users must have both a
                  subscription and an authorization policy.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
            <Checkbox
              id="subscription-create-auth-policy"
              data-testid="subscription-create-auth-policy"
              label={
                <>
                  Create authorization policy{' '}
                  <Popover
                    headerContent="Why create an authorization policy?"
                    bodyContent={
                      <>
                        <p>
                          A <b>subscription</b> (MaaSSubscription) defines which models should be
                          available to certain groups on request, but it does not grant access to
                          those models on its own.
                        </p>
                        <br />
                        <p>
                          An <b>authorization policy</b> (MaaSAuthPolicy) is a separate resource
                          that authorizes specific groups to be able to access model endpoints
                          through the API gateway.
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
            title="Authorization policies are not automatically updated"
            data-testid="policy-change-warning"
          >
            If this subscription has associated authorization policies, you must manually update
            them from the{' '}
            <b>
              <Link to={getSectionUrl('auth-policies')}>Authorization policies page</Link>
            </b>{' '}
            after saving your changes.
          </Alert>
        )}

        {submitError && (
          <Alert
            variant="danger"
            isInline
            title={
              isEditing && isSubscriptionConflictError(submitError)
                ? 'Unable to save subscription'
                : `Failed to ${isEditing ? 'update' : 'create'} subscription`
            }
            data-testid="subscription-submit-error"
            actionLinks={
              isEditing && isSubscriptionConflictError(submitError) ? (
                <AlertActionLink onClick={() => window.location.reload()}>Refresh</AlertActionLink>
              ) : undefined
            }
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
            onClick={() => {
              navigate(returnTo ?? getSectionUrl('subscriptions'));
              fireFormTrackingEvent(
                isEditing ? MaaSEvents.SUBSCRIPTION_UPDATED : MaaSEvents.SUBSCRIPTION_CREATED,
                isEditing
                  ? ({
                      outcome: TrackingOutcome.cancel,
                      editSource,
                    } satisfies SubscriptionUpdatedCancelProperties)
                  : ({
                      outcome: TrackingOutcome.cancel,
                      modelCount: models.length,
                      modelCountWoLimit: modelRefsPayload.filter(
                        (m) => m.tokenRateLimits.length === 0,
                      ).length,
                    } satisfies SubscriptionCreatedCancelProperties),
              );
            }}
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
