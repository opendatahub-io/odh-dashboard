import {
  Alert,
  Button,
  ClipboardCopyButton,
  DatePicker,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormGroup,
  FormHelperText,
  Divider,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupItem,
  InputGroupText,
  MenuToggle,
  MenuToggleElement,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Select,
  SelectList,
  SelectOption,
  Stack,
  StackItem,
  TextArea,
  TextInput,
  yyyyMMddFormat,
} from '@patternfly/react-core';
import TypeaheadSelect, {
  TypeaheadSelectOption,
} from '@odh-dashboard/ui-core/components/TypeaheadSelect';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import React from 'react';
import { z } from 'zod';
import { useZodFormValidation } from '@odh-dashboard/ui-core/hooks/useZodFormValidation';
import TruncatedText from '@odh-dashboard/ui-core/components/TruncatedText';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  EXPIRATION_MODE_VALUES,
  formatApiKeyError,
  formatApiKeyHiddenPreview,
  formatDatePickerValue,
  formatExpirationLabel,
  getAfterDaysValidationMessage,
  getCalendarDaysBetween,
  DEFAULT_AFTER_DAYS,
  getDefaultExpirationDate,
  getExpirationDateValidationMessage,
  getExpirationModeLabel,
  getExpiresInFromDays,
  getMaxSelectableExpirationDate,
  getMinSelectableExpirationDate,
  isExpirationMode,
  startOfLocalDay,
  validateAfterDays,
  validateExpirationDate,
  DATE_PICKER_MAX_DAYS,
  type ExpirationMode,
  getModelDocumentationUrl,
} from '~/app/pages/keys-and-subs/utils';
import { createApiKey } from '~/app/api/api-keys';
import {
  MaaSModelRefSummary,
  ModelSubscriptionRef,
  UserSubscription,
} from '~/app/types/subscriptions';
import MaasModelsSection from '~/app/shared/MaasModelsSection';
import {
  ApiKeyCreateInitiatedFrom,
  ApiKeyCopiedProperties,
  ApiKeyCreatedProperties,
  ApiKeyCreationSubscriptionBrowsedProperties,
  MaaSEvents,
} from '~/app/types/event-tracking';
import { useKeysAndSubsContext } from '~/app/context/KeysAndSubsContext';

const createApiKeySchema = (maxDays: number) =>
  z
    .object({
      name: z
        .string()
        .min(1, 'Name is required')
        .refine((val) => /^[a-zA-Z0-9_-]+$/.test(val), {
          message: 'Name can only contain letters, numbers, dashes, and underscores',
        }),
      description: z.string().optional(),
      expirationMode: z.enum(EXPIRATION_MODE_VALUES),
      expirationDate: z.string(),
      afterDays: z.string(),
      subscription: z.string().min(1, 'Subscription is required'),
    })
    .superRefine((data, ctx) => {
      if (data.expirationMode === 'max') {
        // Max mode is only offered when maxDays is known and positive.
        if (maxDays < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Maximum expiration is unavailable',
            path: ['expirationMode'],
          });
        }
        return;
      }
      if (data.expirationMode === 'onDate') {
        const message = validateExpirationDate(data.expirationDate, maxDays);
        if (message) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message,
            path: ['expirationDate'],
          });
        }
        return;
      }
      const message = validateAfterDays(data.afterDays, maxDays);
      if (message) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
          path: ['afterDays'],
        });
      }
    });

type CreateApiKeyFormData = z.infer<ReturnType<typeof createApiKeySchema>>;

type CopyableDisabledFieldProps = {
  id: string;
  label: string;
  value: string;
  copiedFieldId: string | undefined;
  onCopy: (id: string, value: string) => void;
  onTooltipHidden: () => void;
  helperText?: React.ReactNode;
};

const CopyableDisabledField: React.FC<CopyableDisabledFieldProps> = ({
  id,
  label,
  value,
  copiedFieldId,
  onCopy,
  onTooltipHidden,
  helperText,
}) => (
  <FormGroup label={label} fieldId={id}>
    <InputGroup>
      <InputGroupItem isFill>
        <TextInput id={id} isDisabled aria-label={label} value={value} dir="ltr" />
      </InputGroupItem>
      <InputGroupItem>
        <ClipboardCopyButton
          id={`${id}-copy`}
          data-testid={`${id}-copy-button`}
          variant="control"
          aria-label={`Copy ${label}`}
          hasNoPadding
          onClick={() => onCopy(id, value)}
          onTooltipHidden={onTooltipHidden}
        >
          {copiedFieldId === id ? 'Copied' : 'Copy'}
        </ClipboardCopyButton>
      </InputGroupItem>
    </InputGroup>
    {helperText ? (
      <FormHelperText>
        <HelperText>
          <HelperTextItem>{helperText}</HelperTextItem>
        </HelperText>
      </FormHelperText>
    ) : null}
  </FormGroup>
);

type CreateApiKeyModalProps = {
  onClose: (created?: boolean) => void;
  initialSubscription?: UserSubscription;
  initiatedFrom: ApiKeyCreateInitiatedFrom;
  maxExpirationDays: number;
  apiKeyConfigError?: Error;
};

const CreateApiKeyModal: React.FC<CreateApiKeyModalProps> = ({
  onClose,
  initialSubscription,
  initiatedFrom,
  maxExpirationDays,
  apiKeyConfigError,
}) => {
  const canLockSubscription = Boolean(initialSubscription);
  // When config fails (or returns a non-positive max), skip max enforcement and hide "max" mode.
  const hasKnownMaxExpiration = !apiKeyConfigError && maxExpirationDays > 0;
  const effectiveMaxDays = hasKnownMaxExpiration ? maxExpirationDays : 0;
  const availableExpirationModes = React.useMemo(
    () =>
      hasKnownMaxExpiration
        ? EXPIRATION_MODE_VALUES
        : EXPIRATION_MODE_VALUES.filter((mode) => mode !== 'max'),
    [hasKnownMaxExpiration],
  );

  const { subscriptions, subscriptionsLoaded, subscriptionsError, gatewayUrl } =
    useKeysAndSubsContext();

  const [formData, setFormData] = React.useState<CreateApiKeyFormData>({
    name: '',
    description: '',
    expirationMode: 'onDate',
    expirationDate: formatDatePickerValue(getDefaultExpirationDate()),
    afterDays: String(DEFAULT_AFTER_DAYS),
    subscription: initialSubscription?.subscription_id_header ?? '',
  });
  const [isModeSelectOpen, setIsModeSelectOpen] = React.useState(false); // mode of expiration
  const [isModelSelectOpen, setIsModelSelectOpen] = React.useState(false); // model selection dropdown
  const [selectedModel, setSelectedModel] = React.useState<string | undefined>();
  const [isCreating, setIsCreating] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [createdToken, setCreatedToken] = React.useState<string | undefined>();

  const createApiKeySchemaMemo = React.useMemo(
    () => createApiKeySchema(effectiveMaxDays),
    [effectiveMaxDays],
  );

  const minExpirationDate = React.useMemo(() => getMinSelectableExpirationDate(), []);
  const maxExpirationDate = React.useMemo(
    () =>
      getMaxSelectableExpirationDate(
        hasKnownMaxExpiration ? maxExpirationDays : DATE_PICKER_MAX_DAYS,
      ),
    [hasKnownMaxExpiration, maxExpirationDays],
  );

  const dateValidators = React.useMemo(
    () => [
      (date: Date) => {
        const days = getCalendarDaysBetween(startOfLocalDay(), date);
        const minDays = getCalendarDaysBetween(startOfLocalDay(), minExpirationDate);
        const pickerMaxDays = getCalendarDaysBetween(startOfLocalDay(), maxExpirationDate);
        if (days < minDays || days > pickerMaxDays) {
          return getExpirationDateValidationMessage(effectiveMaxDays);
        }
        return '';
      },
    ],
    [minExpirationDate, maxExpirationDate, effectiveMaxDays],
  );

  const sortedSubscriptions = React.useMemo(
    () => subscriptions.toSorted((a, b) => b.priority - a.priority),
    [subscriptions],
  );

  const selectedSubscription = React.useMemo(
    () =>
      canLockSubscription
        ? initialSubscription
        : sortedSubscriptions.find((s) => s.subscription_id_header === formData.subscription),
    [canLockSubscription, initialSubscription, sortedSubscriptions, formData.subscription],
  );

  const toDescriptionModelCount = (description: string, modelCount: number) =>
    `${description} · ${modelCount} ${modelCount === 1 ? 'model' : 'models'}`;

  const subscriptionSelectOptions = React.useMemo<TypeaheadSelectOption[]>(() => {
    if (canLockSubscription && initialSubscription) {
      return [
        {
          value: initialSubscription.subscription_id_header,
          content: initialSubscription.display_name ?? initialSubscription.subscription_id_header,
          'data-testid': `api-key-subscription-option-${initialSubscription.subscription_id_header}`,
          description: toDescriptionModelCount(
            initialSubscription.subscription_description,
            initialSubscription.model_refs.length,
          ),
        },
      ];
    }
    return sortedSubscriptions.map<TypeaheadSelectOption>((sub) => ({
      value: sub.subscription_id_header,
      content: sub.display_name || sub.subscription_id_header,
      description: (
        <TruncatedText
          maxLines={2}
          content={toDescriptionModelCount(sub.subscription_description, sub.model_refs.length)}
        />
      ),
      'data-testid': `api-key-subscription-option-${sub.subscription_id_header}`,
    }));
  }, [canLockSubscription, initialSubscription, sortedSubscriptions]);

  const modelRefSummaries = React.useMemo<MaaSModelRefSummary[]>(
    () =>
      selectedSubscription?.model_refs.map((ref) => ({
        name: ref.name,
        namespace: ref.namespace ?? '',
        displayName: ref.display_name,
        description: ref.description,
        modelRef: { kind: 'MaaSModelRef', name: ref.name },
      })) ?? [],
    [selectedSubscription],
  );

  const subscriptionModelRefs = React.useMemo<ModelSubscriptionRef[]>(
    () =>
      selectedSubscription?.model_refs.map((ref) => ({
        name: ref.name,
        namespace: ref.namespace ?? '',
        tokenRateLimits: ref.token_rate_limits ?? [],
      })) ?? [],
    [selectedSubscription],
  );

  const availableModelOptions = React.useMemo(
    () =>
      (selectedSubscription?.model_refs ?? []).map((ref) => ({
        value: ref.name,
        label: ref.display_name?.trim() || ref.name,
      })),
    [selectedSubscription],
  );

  const effectiveSelectedModel =
    selectedModel !== undefined && availableModelOptions.some((opt) => opt.value === selectedModel)
      ? selectedModel
      : (availableModelOptions[0]?.value ?? 'No models available');

  const selectedModelOption = availableModelOptions.find(
    (opt) => opt.value === effectiveSelectedModel,
  );

  const modelDocumentationUrl =
    React.useMemo(
      () =>
        effectiveSelectedModel
          ? getModelDocumentationUrl(effectiveSelectedModel, gatewayUrl)
          : undefined,
      [effectiveSelectedModel, gatewayUrl],
    ) ?? undefined;

  const selectedModelRef = React.useMemo(
    () => selectedSubscription?.model_refs.find((ref) => ref.name === effectiveSelectedModel),
    [selectedSubscription, effectiveSelectedModel],
  );

  const isSelectedModelInternal = selectedModelRef?.source?.toLowerCase() === 'internal';

  const { getFieldValidation, getFieldValidationProps } = useZodFormValidation(
    formData,
    createApiKeySchemaMemo,
  );

  const isFormValid = getFieldValidation(undefined, true).length === 0;

  const getExpirationDays = (): number | undefined => {
    if (formData.expirationMode === 'max') {
      return maxExpirationDays;
    }
    if (formData.expirationMode === 'after') {
      const days = parseInt(formData.afterDays, 10);
      return Number.isNaN(days) ? undefined : days;
    }
    const date = formData.expirationDate
      ? new Date(`${formData.expirationDate}T00:00:00`)
      : undefined;
    if (!date || Number.isNaN(date.getTime())) {
      return undefined;
    }
    return getCalendarDaysBetween(startOfLocalDay(), date);
  };

  const getExpiresIn = (): string | undefined => {
    const days = getExpirationDays();
    return days === undefined ? undefined : getExpiresInFromDays(days);
  };

  const getCreateTrackingProps = (outcome: TrackingOutcome, success?: boolean, err?: string) =>
    ({
      outcome,
      ...(success !== undefined && { success }),
      ...(err !== undefined && { error: err }),
      expiresIn: getExpiresIn() ?? formData.expirationMode,
      modelCount: selectedSubscription?.model_refs.length ?? 0,
      initiatedFrom,
    }) satisfies ApiKeyCreatedProperties;

  const [isTokenVisible, setIsTokenVisible] = React.useState(false);
  const [copiedFieldId, setCopiedFieldId] = React.useState<string | undefined>();
  const hasCopiedKey = React.useRef(false);

  const fireKeyCopiedEvent = (copied: boolean) => {
    fireMiscTrackingEvent(MaaSEvents.API_KEY_COPIED, {
      copied,
      initiatedFrom,
    } satisfies ApiKeyCopiedProperties);
  };

  const handleFieldCopy = (id: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedFieldId(id);
    if (id === 'api-key-token') {
      hasCopiedKey.current = true;
      fireKeyCopiedEvent(true);
    }
  };

  const handleClose = (created?: boolean) => {
    if (!createdToken) {
      fireFormTrackingEvent(
        MaaSEvents.API_KEY_CREATED,
        getCreateTrackingProps(TrackingOutcome.cancel),
      );
    } else if (!hasCopiedKey.current) {
      fireKeyCopiedEvent(false);
    }
    onClose(created ?? Boolean(createdToken));
  };

  const handleSubscriptionSelect = (_e: unknown, value: string | number | undefined) => {
    const subscriptionId = String(value);
    setFormData({ ...formData, subscription: subscriptionId });
    if (!canLockSubscription) {
      const subscriptionIndex = sortedSubscriptions.findIndex(
        (s) => s.subscription_id_header === subscriptionId,
      );
      if (subscriptionIndex >= 0) {
        fireMiscTrackingEvent(MaaSEvents.API_KEY_CREATION_SUBSCRIPTION_BROWSED, {
          subscriptionIndex,
          modelCount: sortedSubscriptions[subscriptionIndex].model_refs.length,
          initiatedFrom,
        } satisfies ApiKeyCreationSubscriptionBrowsedProperties);
      }
    }
  };

  const handleSubmit = async () => {
    setIsCreating(true);
    setError(undefined);

    try {
      const response = await createApiKey()(
        {},
        {
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
          expiresIn: getExpiresIn(),
          subscription: formData.subscription,
        },
      );

      fireFormTrackingEvent(
        MaaSEvents.API_KEY_CREATED,
        getCreateTrackingProps(TrackingOutcome.submit, true),
      );
      setCreatedToken(response.key);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create API key';
      const formatted = formatApiKeyError(msg);
      fireFormTrackingEvent(
        MaaSEvents.API_KEY_CREATED,
        getCreateTrackingProps(TrackingOutcome.submit, false, formatted),
      );
      setError(new Error(formatted));
    } finally {
      setIsCreating(false);
    }
  };

  const expirationDays = getExpirationDays();
  const expirationLabel =
    expirationDays === undefined
      ? formData.expirationMode
      : formatExpirationLabel(expirationDays, formData.expirationMode);

  const hiddenToken = createdToken ? formatApiKeyHiddenPreview(createdToken) : '';

  const handleExpirationModeChange = (mode: ExpirationMode) => {
    if (mode === 'max' && !hasKnownMaxExpiration) {
      return;
    }
    setFormData({
      ...formData,
      expirationMode: mode,
      ...(mode === 'onDate' && !formData.expirationDate
        ? { expirationDate: formatDatePickerValue(getDefaultExpirationDate()) }
        : {}),
      ...(mode === 'after' && !formData.afterDays ? { afterDays: String(DEFAULT_AFTER_DAYS) } : {}),
    });
    setIsModeSelectOpen(false);
    setError(undefined);
  };

  return (
    <Modal variant={ModalVariant.medium} isOpen onClose={() => handleClose()}>
      <ModalHeader title={createdToken ? 'API key created' : 'Create API key'} />
      <ModalBody>
        {createdToken ? (
          <Stack hasGutter>
            <StackItem>
              <Alert
                variant="success"
                isInline
                title="Save your API key"
                data-testid="api-key-created-alert"
              >
                This is the only time you will see this key. Copy it now and store it securely.
              </Alert>
            </StackItem>
            <StackItem>
              <DescriptionList isHorizontal isCompact>
                <DescriptionListGroup>
                  <DescriptionListTerm>API key name</DescriptionListTerm>
                  <DescriptionListDescription data-testid="api-key-display-name">
                    {formData.name}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {formData.description && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Description</DescriptionListTerm>
                    <DescriptionListDescription data-testid="api-key-display-description">
                      {formData.description}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                <DescriptionListGroup>
                  <DescriptionListTerm>Subscription</DescriptionListTerm>
                  <DescriptionListDescription data-testid="api-key-display-subscription">
                    {selectedSubscription?.display_name ??
                      selectedSubscription?.subscription_id_header ??
                      formData.subscription}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Expiration</DescriptionListTerm>
                  <DescriptionListDescription data-testid="api-key-display-expiration">
                    {expirationLabel}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </StackItem>
            <StackItem>
              <Divider />
            </StackItem>
            <StackItem>
              <Form>
                <FormGroup label="API key" fieldId="api-key-token">
                  <InputGroup data-testid="api-key-token-copy-section">
                    <InputGroupItem isFill>
                      <TextInput
                        id="api-key-token"
                        readOnly
                        aria-label="API key"
                        value={isTokenVisible ? createdToken : hiddenToken}
                        dir="ltr"
                      />
                    </InputGroupItem>
                    <InputGroupItem>
                      <Button
                        variant="control"
                        data-testid="api-key-visibility-toggle"
                        aria-label={isTokenVisible ? 'Hide API key' : 'Show API key'}
                        icon={isTokenVisible ? <EyeSlashIcon /> : <EyeIcon />}
                        onClick={() => setIsTokenVisible((v) => !v)}
                      />
                    </InputGroupItem>
                    <InputGroupItem>
                      <ClipboardCopyButton
                        id="api-key-created-copy"
                        data-testid="api-key-token-copy-button"
                        variant="control"
                        aria-label="Copy API key"
                        hasNoPadding
                        onClick={() => {
                          if (createdToken) {
                            handleFieldCopy('api-key-token', createdToken);
                          }
                        }}
                        onTooltipHidden={() => setCopiedFieldId(undefined)}
                      >
                        {copiedFieldId === 'api-key-token' ? 'Copied' : 'Copy'}
                      </ClipboardCopyButton>
                    </InputGroupItem>
                  </InputGroup>
                </FormGroup>
                {gatewayUrl && (
                  <CopyableDisabledField
                    id="api-key-base-url"
                    label="Base URL"
                    value={gatewayUrl}
                    copiedFieldId={copiedFieldId}
                    onCopy={handleFieldCopy}
                    onTooltipHidden={() => setCopiedFieldId(undefined)}
                    helperText={
                      <>
                        Universal MaaS gateway base URL (shared across models). Do not use a
                        model-specific path in the URL.
                      </>
                    }
                  />
                )}
                <CopyableDisabledField
                  id="api-key-subscription-id"
                  label="Subscription ID"
                  value={selectedSubscription?.subscription_id_header ?? ''}
                  copiedFieldId={copiedFieldId}
                  onCopy={handleFieldCopy}
                  onTooltipHidden={() => setCopiedFieldId(undefined)}
                />
                <FormGroup label="Available models" fieldId="api-key-available-models">
                  <Select
                    id="api-key-available-models"
                    isOpen={isModelSelectOpen}
                    onOpenChange={(open) => setIsModelSelectOpen(open)}
                    selected={effectiveSelectedModel}
                    onSelect={(_event, value) => {
                      if (typeof value === 'string') {
                        setSelectedModel(value);
                      }
                      setIsModelSelectOpen(false);
                    }}
                    toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                      <MenuToggle
                        ref={toggleRef}
                        onClick={() => setIsModelSelectOpen(!isModelSelectOpen)}
                        isExpanded={isModelSelectOpen}
                        isFullWidth
                        isDisabled={availableModelOptions.length === 0}
                        data-testid="api-key-available-models-toggle"
                      >
                        {selectedModelOption?.label ?? 'No models available'}
                      </MenuToggle>
                    )}
                  >
                    <SelectList>
                      {availableModelOptions.map((opt) => (
                        <SelectOption
                          key={opt.value}
                          value={opt.value}
                          data-testid={`api-key-available-models-option-${opt.value}`}
                        >
                          {opt.label}
                        </SelectOption>
                      ))}
                    </SelectList>
                  </Select>
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        These models are available with your subscription. Select a model to update
                        the model ID and usage.
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
                {availableModelOptions.length > 0 && (
                  <CopyableDisabledField
                    id="api-key-model-id"
                    label="Model ID"
                    value={effectiveSelectedModel}
                    copiedFieldId={copiedFieldId}
                    onCopy={handleFieldCopy}
                    onTooltipHidden={() => setCopiedFieldId(undefined)}
                  />
                )}
                {modelDocumentationUrl && isSelectedModelInternal && (
                  <CopyableDisabledField
                    id="api-key-model-documentation"
                    label="Model documentation"
                    value={modelDocumentationUrl}
                    copiedFieldId={copiedFieldId}
                    onCopy={handleFieldCopy}
                    onTooltipHidden={() => setCopiedFieldId(undefined)}
                    helperText="OpenAPI documentation for this model. Opens the FastAPI / Swagger UI."
                  />
                )}
              </Form>
            </StackItem>
          </Stack>
        ) : (
          <Stack hasGutter>
            {!canLockSubscription &&
              subscriptionsLoaded &&
              subscriptions.length === 0 &&
              !subscriptionsError && (
                <StackItem>
                  <Alert
                    variant="warning"
                    isInline
                    title="No subscriptions available"
                    data-testid="no-subscriptions-alert"
                  >
                    You don&apos;t have access to any subscriptions. Ask your admin to add you to a
                    subscription.
                  </Alert>
                </StackItem>
              )}
            {!canLockSubscription && subscriptionsError && (
              <StackItem>
                <Alert
                  variant="danger"
                  isInline
                  title="Failed to load subscriptions"
                  data-testid="subscriptions-error-alert"
                >
                  {subscriptionsError.message}
                </Alert>
              </StackItem>
            )}
            {apiKeyConfigError && (
              <StackItem>
                <Alert
                  variant="warning"
                  isInline
                  title="Failed to load maximum expiration days"
                  data-testid="api-key-config-error-alert"
                >
                  {apiKeyConfigError.message}. You can still create an API key, but expiration is
                  not limited by a known maximum.
                </Alert>
              </StackItem>
            )}
            <StackItem>
              <Form>
                <FormGroup label="Name" isRequired fieldId="api-key-name">
                  <TextInput
                    isRequired
                    type="text"
                    id="api-key-name"
                    name="api-key-name"
                    value={formData.name}
                    onChange={(_event, value) => setFormData({ ...formData, name: value })}
                    {...getFieldValidationProps(['name'])}
                    data-testid="api-key-name-input"
                  />
                  {getFieldValidation(['name']).length > 0 && (
                    <FormHelperText>
                      <HelperText>
                        <HelperTextItem variant="error">
                          {getFieldValidation(['name'])[0].message}
                        </HelperTextItem>
                      </HelperText>
                    </FormHelperText>
                  )}
                </FormGroup>

                <FormGroup label="Description" fieldId="api-key-description">
                  <TextArea
                    id="api-key-description"
                    name="api-key-description"
                    value={formData.description}
                    onChange={(_event, value) => setFormData({ ...formData, description: value })}
                    rows={5}
                    data-testid="api-key-description-input"
                  />
                </FormGroup>

                <FormGroup label="Subscription" isRequired fieldId="api-key-subscription">
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        Select a subscription to scope this API key to. The key will work only with
                        models that belong to the selected subscription.
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                  <TypeaheadSelect
                    id="api-key-subscription"
                    selectOptions={subscriptionSelectOptions}
                    selected={formData.subscription}
                    onSelect={handleSubscriptionSelect}
                    isDisabled={
                      canLockSubscription || !subscriptionsLoaded || subscriptions.length === 0
                    }
                    placeholder="Select a subscription"
                    dataTestId="api-key-subscription-toggle"
                    previewDescription={false}
                    isRequired={false}
                    popperProps={{ maxWidth: 'trigger' }}
                    isScrollable
                  />
                </FormGroup>

                {selectedSubscription && (
                  <>
                    {selectedSubscription.cost_center && (
                      <FormGroup fieldId="api-key-subscription-details">
                        <DescriptionList
                          isHorizontal
                          isCompact
                          data-testid="subscription-cost-center-details"
                        >
                          <DescriptionListGroup>
                            <DescriptionListTerm>Cost center</DescriptionListTerm>
                            <DescriptionListDescription data-testid="subscription-cost-center">
                              {selectedSubscription.cost_center}
                            </DescriptionListDescription>
                          </DescriptionListGroup>
                        </DescriptionList>
                      </FormGroup>
                    )}
                    <FormGroup fieldId="api-key-subscription-models">
                      <MaasModelsSection
                        modelRefSummaries={modelRefSummaries}
                        modelRefsWithRateLimits={subscriptionModelRefs}
                        hideColumns={['project']}
                        titleHeadingLevel="h3"
                        titleSize="md"
                        resourceType="subscription"
                      />
                    </FormGroup>
                  </>
                )}

                <FormGroup label="Expiration" fieldId="api-key-expiration" isRequired>
                  <InputGroup>
                    <InputGroupItem>
                      <Select
                        id="api-key-expiration-mode"
                        isOpen={isModeSelectOpen}
                        onOpenChange={(open) => setIsModeSelectOpen(open)}
                        selected={formData.expirationMode}
                        onSelect={(_event, value) => {
                          if (isExpirationMode(value)) {
                            handleExpirationModeChange(value);
                          }
                        }}
                        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                          <MenuToggle
                            ref={toggleRef}
                            variant="default"
                            onClick={() => setIsModeSelectOpen(!isModeSelectOpen)}
                            isExpanded={isModeSelectOpen}
                            data-testid="api-key-expiration-mode-toggle"
                          >
                            {getExpirationModeLabel(
                              formData.expirationMode,
                              hasKnownMaxExpiration ? maxExpirationDays : 0,
                            )}
                          </MenuToggle>
                        )}
                      >
                        <SelectList>
                          {availableExpirationModes.map((mode) => (
                            <SelectOption
                              key={mode}
                              value={mode}
                              data-testid={`api-key-expiration-mode-${mode}`}
                            >
                              {getExpirationModeLabel(
                                mode,
                                hasKnownMaxExpiration ? maxExpirationDays : 0,
                              )}
                            </SelectOption>
                          ))}
                        </SelectList>
                      </Select>
                    </InputGroupItem>
                    {formData.expirationMode === 'onDate' && (
                      <InputGroupItem isFill>
                        <DatePicker
                          id="api-key-expiration-date"
                          data-testid="api-key-expiration-date-picker"
                          value={formData.expirationDate}
                          dateFormat={yyyyMMddFormat}
                          requiredDateOptions={{
                            isRequired: true,
                            emptyDateText: 'Expiration date is required',
                          }}
                          validators={dateValidators}
                          onChange={(_event, value) => {
                            setFormData({ ...formData, expirationDate: value });
                            setError(undefined);
                          }}
                          inputProps={getFieldValidationProps(['expirationDate'])}
                        />
                      </InputGroupItem>
                    )}
                    {formData.expirationMode === 'after' && (
                      <>
                        <InputGroupItem>
                          <TextInput
                            id="api-key-expiration-after-days"
                            type="number"
                            min={1}
                            {...(hasKnownMaxExpiration ? { max: maxExpirationDays } : {})}
                            step={1}
                            value={formData.afterDays}
                            aria-label="Number of days until expiration"
                            onChange={(_event, value) => {
                              setFormData({ ...formData, afterDays: value });
                              setError(undefined);
                            }}
                            {...getFieldValidationProps(['afterDays'])}
                            style={{
                              // Room for digits + form-control status icon (+ number spinner chrome)
                              width: `calc(${Math.max(
                                String(
                                  hasKnownMaxExpiration
                                    ? maxExpirationDays
                                    : formData.afterDays || 99,
                                ).length,
                                2,
                              )}ch + 4.5rem)`,
                              minWidth: '9rem',
                            }}
                            data-testid="api-key-expiration-after-days-input"
                          />
                        </InputGroupItem>
                        <InputGroupText isPlain id="api-key-expiration-after-days-suffix">
                          days
                        </InputGroupText>
                      </>
                    )}
                  </InputGroup>
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem
                        data-testid="api-key-expiration-helper"
                        variant={
                          (formData.expirationMode === 'onDate' &&
                            getFieldValidation(['expirationDate']).length > 0) ||
                          (formData.expirationMode === 'after' &&
                            getFieldValidation(['afterDays']).length > 0)
                            ? 'error'
                            : 'default'
                        }
                      >
                        {formData.expirationMode === 'max' &&
                          hasKnownMaxExpiration &&
                          `Expires in ${maxExpirationDays} days`}
                        {formData.expirationMode === 'onDate' &&
                          (getFieldValidation(['expirationDate'])[0]?.message ??
                            getExpirationDateValidationMessage(effectiveMaxDays))}
                        {formData.expirationMode === 'after' &&
                          (getFieldValidation(['afterDays'])[0]?.message ??
                            getAfterDaysValidationMessage(effectiveMaxDays))}
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
              </Form>
            </StackItem>
          </Stack>
        )}
      </ModalBody>
      <ModalFooter>
        {createdToken ? (
          <Button
            key="close"
            variant="primary"
            onClick={() => handleClose(true)}
            data-testid="close-api-key-button"
          >
            Close
          </Button>
        ) : (
          <Stack hasGutter>
            {error && (
              <StackItem>
                <Alert
                  data-testid="create-api-key-error-alert"
                  title="Error creating API key"
                  isInline
                  variant="danger"
                >
                  {error.message}
                </Alert>
              </StackItem>
            )}
            <StackItem>
              <Button
                key="create"
                variant="primary"
                onClick={handleSubmit}
                isDisabled={
                  !isFormValid || isCreating || (!canLockSubscription && subscriptions.length === 0)
                }
                isLoading={isCreating}
                data-testid="submit-create-api-key-button"
              >
                Create API key
              </Button>
              <Button
                key="cancel"
                variant="link"
                onClick={() => handleClose()}
                isDisabled={isCreating}
              >
                Cancel
              </Button>
            </StackItem>
          </Stack>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default CreateApiKeyModal;
