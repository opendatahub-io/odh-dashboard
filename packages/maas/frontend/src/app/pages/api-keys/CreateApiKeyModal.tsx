import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  ClipboardCopy,
  ClipboardCopyVariant,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Icon,
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
  Spinner,
  Stack,
  StackItem,
  TextArea,
  TextInput,
  Title,
} from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import { z } from 'zod';
import { useZodFormValidation } from '@odh-dashboard/internal/hooks/useZodFormValidation';
import { formatApiKeyError } from '~/app/pages/api-keys/utils';
import { createApiKey } from '~/app/api/api-keys';
import { useUserSubscriptions } from '~/app/hooks/useUserSubscriptions';
import { MaaSModelRefSummary, ModelSubscriptionRef } from '~/app/types/subscriptions';
import SubscriptionModelsSection from '~/app/pages/subscriptions/viewSubscription/SubscriptionModelsSection';

const EXPIRATION_OPTION_VALUES = ['30d', '60d', '90d', '180d', '1y', 'custom'] as const;

type ExpirationOptionValue = (typeof EXPIRATION_OPTION_VALUES)[number];

const EXPIRATION_OPTIONS: { value: ExpirationOptionValue; label: string; expiresIn?: string }[] = [
  { value: '30d', label: '30 days', expiresIn: '30d' },
  { value: '60d', label: '60 days', expiresIn: '60d' },
  { value: '90d', label: '90 days', expiresIn: '90d' },
  { value: '180d', label: '180 days', expiresIn: '180d' },
  { value: '1y', label: '1 year', expiresIn: '365d' },
  { value: 'custom', label: 'Custom (days)' },
];

const isValidExpirationOption = (v: string | number | undefined): v is ExpirationOptionValue =>
  EXPIRATION_OPTION_VALUES.some((val) => val === v);

const createApiKeySchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .refine((val) => /^[a-zA-Z0-9_-]+$/.test(val), {
        message: 'Name can only contain letters, numbers, dashes, and underscores',
      }),
    description: z.string().optional(),
    expirationOption: z.enum(EXPIRATION_OPTION_VALUES),
    customDays: z.string().optional(),
    subscription: z.string().min(1, 'Subscription is required'),
  })
  .superRefine((data, ctx) => {
    if (data.expirationOption === 'custom') {
      const days = parseInt(data.customDays ?? '', 10);
      if (!data.customDays || !/^\d+$/.test(data.customDays) || days < 1 || days > 365) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a value between 1 and 365 days',
          path: ['customDays'],
        });
      }
    }
  });

type CreateApiKeyFormData = z.infer<typeof createApiKeySchema>;

type CreateApiKeyModalProps = {
  onClose: () => void;
};

const CreateApiKeyModal: React.FC<CreateApiKeyModalProps> = ({ onClose }) => {
  const [subscriptions, subscriptionsLoaded, subscriptionsError] = useUserSubscriptions();
  const [formData, setFormData] = React.useState<CreateApiKeyFormData>({
    name: '',
    description: '',
    expirationOption: '30d',
    customDays: '',
    subscription: '',
  });
  const [isSelectOpen, setIsSelectOpen] = React.useState(false);
  const [isSubscriptionSelectOpen, setIsSubscriptionSelectOpen] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [createdToken, setCreatedToken] = React.useState<string | undefined>();

  const selectedSubscription = React.useMemo(
    () => subscriptions.find((s) => s.subscription_id_header === formData.subscription),
    [subscriptions, formData.subscription],
  );

  const modelRefSummaries = React.useMemo<MaaSModelRefSummary[]>(
    () =>
      selectedSubscription?.model_refs.map((ref) => ({
        name: ref.name,
        namespace: ref.namespace ?? '',
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

  const { getFieldValidation, getFieldValidationProps } = useZodFormValidation(
    formData,
    createApiKeySchema,
  );

  const isFormValid = () => {
    const result = createApiKeySchema.safeParse(formData);
    return result.success;
  };

  const selectedOption = EXPIRATION_OPTIONS.find((opt) => opt.value === formData.expirationOption);

  const getExpiresIn = (): string | undefined => {
    if (formData.expirationOption === 'custom') {
      const days = parseInt(formData.customDays ?? '', 10);
      return Number.isNaN(days) ? undefined : `${days}d`;
    }
    return selectedOption?.expiresIn;
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

      setCreatedToken(response.key);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create API key';
      setError(new Error(formatApiKeyError(msg)));
    } finally {
      setIsCreating(false);
    }
  };

  const expirationLabel =
    formData.expirationOption === 'custom' ? `${formData.customDays} days` : selectedOption?.label;

  return (
    <Modal variant={ModalVariant.medium} isOpen onClose={onClose}>
      <ModalHeader title={createdToken ? 'API key created' : 'Create API key'} />
      <ModalBody>
        {createdToken ? (
          <Stack hasGutter>
            <StackItem>
              <Alert
                variant="warning"
                isInline
                title="Save your API key"
                data-testid="api-key-created-alert"
              >
                This is the only time you will see this key. Copy it now and store it securely.
              </Alert>
            </StackItem>
            <StackItem>
              <Card>
                <CardTitle>
                  <Flex
                    alignItems={{ default: 'alignItemsCenter' }}
                    spaceItems={{ default: 'spaceItemsSm' }}
                  >
                    <FlexItem>
                      <CheckCircleIcon color="green" />
                    </FlexItem>
                    <FlexItem>
                      <Title headingLevel="h3"> Your API key </Title>
                    </FlexItem>
                  </Flex>
                </CardTitle>
                <CardBody>
                  <ClipboardCopy
                    variant={ClipboardCopyVariant.expansion}
                    hoverTip="Copy"
                    clickTip="Copied"
                    data-testid="api-key-token-copy"
                    onCopy={() => {
                      navigator.clipboard.writeText(createdToken);
                    }}
                  >
                    {createdToken}
                  </ClipboardCopy>
                </CardBody>
              </Card>
            </StackItem>
            <StackItem>
              <Card>
                <CardBody>
                  <DescriptionList isHorizontal isCompact>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Name</DescriptionListTerm>
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
                          selectedSubscription?.subscription_id_header}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Expiration</DescriptionListTerm>
                      <DescriptionListDescription data-testid="api-key-display-expiration">
                        {expirationLabel}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>
                </CardBody>
              </Card>
            </StackItem>
          </Stack>
        ) : (
          <Stack hasGutter>
            {subscriptionsLoaded && subscriptions.length === 0 && !subscriptionsError && (
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
            {subscriptionsError && (
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
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>A descriptive name for this API key</HelperTextItem>
                    </HelperText>
                  </FormHelperText>
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
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        Optional description of how this key will be used
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>

                <FormGroup label="Subscription" isRequired fieldId="api-key-subscription">
                  <Select
                    id="api-key-subscription"
                    isOpen={isSubscriptionSelectOpen}
                    onOpenChange={(open) => setIsSubscriptionSelectOpen(open)}
                    selected={formData.subscription}
                    onSelect={(_event, value) => {
                      if (typeof value === 'string') {
                        setFormData({ ...formData, subscription: value });
                      }
                      setIsSubscriptionSelectOpen(false);
                    }}
                    toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                      <MenuToggle
                        ref={toggleRef}
                        onClick={() => setIsSubscriptionSelectOpen(!isSubscriptionSelectOpen)}
                        isExpanded={isSubscriptionSelectOpen}
                        isFullWidth
                        isDisabled={!subscriptionsLoaded || subscriptions.length === 0}
                        icon={
                          !subscriptionsLoaded && !subscriptionsError ? (
                            <Icon>
                              <Spinner size="sm" aria-label="Loading subscriptions" />
                            </Icon>
                          ) : undefined
                        }
                        data-testid="api-key-subscription-toggle"
                      >
                        {selectedSubscription?.display_name ??
                          selectedSubscription?.subscription_id_header ??
                          'Select a subscription'}
                      </MenuToggle>
                    )}
                  >
                    <SelectList>
                      {subscriptions.map((sub) => (
                        <SelectOption
                          key={sub.subscription_id_header}
                          value={sub.subscription_id_header}
                          description={`${sub.subscription_description} · ${sub.model_refs.length} ${sub.model_refs.length === 1 ? 'model' : 'models'}`}
                          data-testid={`api-key-subscription-option-${sub.subscription_id_header}`}
                        >
                          {sub.display_name || sub.subscription_id_header}
                        </SelectOption>
                      ))}
                    </SelectList>
                  </Select>
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        Select a subscription to scope this API key. The key will only work with
                        models in the selected subscription.
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
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
                      <SubscriptionModelsSection
                        modelRefSummaries={modelRefSummaries}
                        subscriptionModelRefs={subscriptionModelRefs}
                        hideColumns={['project']}
                        titleHeadingLevel="h3"
                        titleSize="md"
                      />
                    </FormGroup>
                  </>
                )}

                <FormGroup label="Expiration" fieldId="api-key-expiration">
                  <Select
                    id="api-key-expiration"
                    isOpen={isSelectOpen}
                    onOpenChange={(open) => setIsSelectOpen(open)}
                    selected={formData.expirationOption}
                    onSelect={(_event, value) => {
                      if (isValidExpirationOption(value)) {
                        setFormData({ ...formData, expirationOption: value, customDays: '' });
                        setError(undefined);
                      }
                      setIsSelectOpen(false);
                    }}
                    toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                      <MenuToggle
                        ref={toggleRef}
                        onClick={() => setIsSelectOpen(!isSelectOpen)}
                        isExpanded={isSelectOpen}
                        isFullWidth
                        data-testid="api-key-expiration-toggle"
                      >
                        {selectedOption?.label ?? '30 days'}
                      </MenuToggle>
                    )}
                  >
                    <SelectList>
                      {EXPIRATION_OPTIONS.map((opt) => (
                        <SelectOption
                          key={opt.value}
                          value={opt.value}
                          data-testid={`api-key-expiration-option-${opt.value}`}
                        >
                          {opt.label}
                        </SelectOption>
                      ))}
                    </SelectList>
                  </Select>
                </FormGroup>

                {formData.expirationOption === 'custom' && (
                  <FormGroup label="Number of days" isRequired fieldId="api-key-custom-days">
                    <TextInput
                      isRequired
                      type="number"
                      id="api-key-custom-days"
                      name="api-key-custom-days"
                      placeholder="Enter number of days (1-365)"
                      min={1}
                      max={365}
                      step={1}
                      value={formData.customDays}
                      onChange={(_event, value) => setFormData({ ...formData, customDays: value })}
                      {...getFieldValidationProps(['customDays'])}
                      data-testid="api-key-custom-days-input"
                    />
                    <FormHelperText>
                      <HelperText>
                        <HelperTextItem
                          variant={
                            getFieldValidation(['customDays']).length > 0 ? 'error' : 'default'
                          }
                        >
                          {getFieldValidation(['customDays'])[0]?.message ??
                            'Enter a value between 1 and 365 days'}
                        </HelperTextItem>
                      </HelperText>
                    </FormHelperText>
                  </FormGroup>
                )}
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
            onClick={onClose}
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
                isDisabled={!isFormValid() || isCreating || subscriptions.length === 0}
                isLoading={isCreating}
                data-testid="submit-create-api-key-button"
              >
                Create API key
              </Button>
              <Button key="cancel" variant="link" onClick={onClose} isDisabled={isCreating}>
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
