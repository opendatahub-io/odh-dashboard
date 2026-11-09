import React from 'react';
import {
  Alert,
  Button,
  ClipboardCopyButton,
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  MenuToggleElement,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  SelectList,
  SelectOption,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { APIOptions, FetchStateCallbackPromise, NotReadyError, useFetchState } from 'mod-arch-core';
import FieldGroupHelpLabelIcon from '@odh-dashboard/ui-core/components/FieldGroupHelpLabelIcon';
import { getMaaSModelsList } from '~/app/api/maas-models';
import { MaaSModel } from '~/app/types/maas-model';
import { APIKey } from '~/app/types/api-key';
import { ModelRefInfo, UserSubscription } from '~/app/types/subscriptions';
import { useKeysAndSubsContext } from '~/app/context/KeysAndSubsContext';
import { getUserSubscription } from '~/app/api/subscriptions';
import {
  buildApiKeyUsageExample,
  findMaaSModelBySubscriptionRef,
  getApiKeyUsageExampleEndpointPath,
  resolveApiKeyUsageExampleKind,
} from '~/app/pages/keys-and-subs/utils';
import CopyableDisabledField from '~/app/shared/CopyableDisabledField';

const PLACEHOLDER_API_KEY = 'your_api_key_here';

const modelRefKey = (ref: ModelRefInfo): string => `${ref.namespace ?? ''}/${ref.name}`;

const formatDate = (dateString?: string, fallback = '—'): string => {
  if (!dateString) {
    return fallback;
  }
  const timestamp = Date.parse(dateString);
  if (Number.isNaN(timestamp)) {
    return fallback;
  }
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

type AccessDetailsModalProps = {
  apiKey: APIKey;
  /** Individually loaded subscription for the key, when the caller already has it. */
  subscription?: UserSubscription;
  onClose: () => void;
};

/**
 * Connection details for an existing API key. Reuses the content of the API key
 * copy (post-creation) modal, except the API key value itself is never shown —
 * the usage example uses a placeholder instead.
 */
const AccessDetailsModal: React.FC<AccessDetailsModalProps> = ({
  apiKey,
  subscription: subscriptionProp,
  onClose,
}) => {
  const { subscriptions } = useKeysAndSubsContext();
  const [isModelSelectOpen, setIsModelSelectOpen] = React.useState(false);
  const [selectedModel, setSelectedModel] = React.useState<string | undefined>(undefined);
  const [copied, setCopied] = React.useState(false);

  // Prefer the individually loaded subscription (which is not filtered to the
  // viewer's My Subscriptions view); fall back to the context list, and lazily
  // fetch the key's subscription individually when neither has it.
  const contextSubscription = React.useMemo(
    () => subscriptions.find((s) => s.subscription_id_header === apiKey.subscription),
    [subscriptions, apiKey.subscription],
  );

  const fetchSubscriptionCallback = React.useCallback<
    FetchStateCallbackPromise<UserSubscription | undefined>
  >(
    (opts) => {
      if (subscriptionProp || contextSubscription || !apiKey.subscription) {
        return Promise.reject(new NotReadyError('Subscription already resolved or unknown'));
      }
      return getUserSubscription()(apiKey.subscription)(opts);
    },
    [subscriptionProp, contextSubscription, apiKey.subscription],
  );
  const [fetchedSubscription, , fetchedSubscriptionError] = useFetchState(
    fetchSubscriptionCallback,
    undefined,
  );

  const subscription = subscriptionProp ?? contextSubscription ?? fetchedSubscription;

  const availableModelOptions = React.useMemo(
    () =>
      (subscription?.model_refs ?? []).map((ref) => ({
        value: modelRefKey(ref),
        label: ref.display_name?.trim() || ref.name,
      })),
    [subscription],
  );

  const effectiveSelectedModel =
    selectedModel !== undefined && availableModelOptions.some((opt) => opt.value === selectedModel)
      ? selectedModel
      : (availableModelOptions[0]?.value ?? '');
  const selectedModelOption = availableModelOptions.find(
    (opt) => opt.value === effectiveSelectedModel,
  );

  const modelsCallback = React.useCallback<FetchStateCallbackPromise<MaaSModel[]>>(
    (opts: APIOptions) => getMaaSModelsList()(opts),
    [],
  );
  const [maasModels] = useFetchState(modelsCallback, []);

  const selectedModelRef = subscription?.model_refs.find(
    (ref) => modelRefKey(ref) === effectiveSelectedModel,
  );
  const selectedMaaSModel = selectedModelRef
    ? findMaaSModelBySubscriptionRef(maasModels, {
        refName: selectedModelRef.name,
        refNamespace: selectedModelRef.namespace,
        catalogModelId: selectedModelRef.model_name,
        subscriptionId: subscription?.subscription_id_header,
        subscriptionModelRefCount: subscription?.model_refs.length,
      })
    : undefined;

  const baseUrl = selectedMaaSModel?.url;
  const modelId = selectedMaaSModel?.id ?? '';
  const usageExampleKind = resolveApiKeyUsageExampleKind(
    selectedMaaSModel?.modelDetails?.modelCapabilities,
  );
  const usageExampleEndpointPath = getApiKeyUsageExampleEndpointPath(usageExampleKind);
  const usageExample = buildApiKeyUsageExample(
    baseUrl,
    modelId,
    PLACEHOLDER_API_KEY,
    usageExampleKind,
  );

  const subscriptionDisplayName =
    subscription?.display_name ??
    subscription?.subscription_id_header ??
    apiKey.subscription ??
    '—';
  const subscriptionIdValue = subscription?.subscription_id_header ?? apiKey.subscription;

  return (
    <Modal
      variant="medium"
      isOpen
      onClose={onClose}
      aria-label="API key access details"
      data-testid="api-key-access-details-modal"
    >
      <ModalHeader title="Access details" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <DescriptionList isHorizontal isCompact>
              <DescriptionListGroup>
                <DescriptionListTerm>API key name</DescriptionListTerm>
                <DescriptionListDescription data-testid="access-details-api-key-name">
                  {apiKey.name}
                </DescriptionListDescription>
              </DescriptionListGroup>
              {apiKey.description && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Description</DescriptionListTerm>
                  <DescriptionListDescription data-testid="access-details-api-key-description">
                    {apiKey.description}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}
              <DescriptionListGroup>
                <DescriptionListTerm>Subscription</DescriptionListTerm>
                <DescriptionListDescription data-testid="access-details-subscription">
                  {subscriptionDisplayName}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Expiration</DescriptionListTerm>
                <DescriptionListDescription data-testid="access-details-expiration">
                  {formatDate(apiKey.expirationDate, 'Never')}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
            <Divider className="pf-v6-u-mt-md" />
          </StackItem>
          <StackItem>
            {!subscription && fetchedSubscriptionError && (
              <Alert
                variant="danger"
                isInline
                title="Failed to load subscription details"
                className="pf-v6-u-mb-lg"
                data-testid="access-details-subscription-error"
              >
                {fetchedSubscriptionError.message}
              </Alert>
            )}
            <Form>
              {baseUrl && (
                <CopyableDisabledField
                  id="access-details-base-url"
                  label="Base URL"
                  value={baseUrl}
                  labelHelp={
                    <FieldGroupHelpLabelIcon
                      buttonTestId="access-details-base-url-help-icon"
                      content="This is the base URL that is shared by all MaaS models in this subscription."
                    />
                  }
                />
              )}
              {subscriptionIdValue && (
                <CopyableDisabledField
                  id="access-details-subscription-id"
                  label="Subscription ID"
                  value={subscriptionIdValue}
                />
              )}
              {subscription && (
                <FormGroup
                  label="Model"
                  fieldId="access-details-available-models"
                  labelHelp={
                    <FieldGroupHelpLabelIcon
                      buttonTestId="access-details-model-help-icon"
                      content="Select a model to view its ID and documentation."
                    />
                  }
                >
                  <Select
                    id="access-details-available-models"
                    isOpen={isModelSelectOpen}
                    onOpenChange={setIsModelSelectOpen}
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
                        data-testid="access-details-available-models-toggle"
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
                          data-testid={`access-details-model-option-${opt.value}`}
                        >
                          {opt.label}
                        </SelectOption>
                      ))}
                    </SelectList>
                  </Select>
                </FormGroup>
              )}
              {modelId && (
                <CopyableDisabledField
                  id="access-details-model-id"
                  label="Model ID"
                  value={modelId}
                />
              )}
              {usageExample && (
                <FormGroup label="Usage example" fieldId="access-details-usage-example">
                  <CodeBlock
                    actions={
                      <CodeBlockAction>
                        <ClipboardCopyButton
                          id="access-details-usage-example-copy"
                          data-testid="access-details-usage-example-copy-button"
                          aria-label="Copy usage example"
                          exitDelay={copied ? 1500 : 600}
                          onClick={() => {
                            void navigator.clipboard
                              .writeText(usageExample)
                              .then(() => setCopied(true))
                              .catch(() => undefined);
                          }}
                          onTooltipHidden={() => setCopied(false)}
                          variant="plain"
                        >
                          {copied ? 'Copied' : 'Copy'}
                        </ClipboardCopyButton>
                      </CodeBlockAction>
                    }
                  >
                    <CodeBlockCode data-testid="access-details-usage-example">
                      {usageExample}
                    </CodeBlockCode>
                  </CodeBlock>
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        Replace <code>your_api_key_here</code> with your saved API key before
                        running the example.
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>
              )}
              {usageExample && (
                <Alert
                  variant="info"
                  isInline
                  data-testid="access-details-endpoint-compatibility-alert"
                  title={`This example uses the standard OpenAI-compatible ${usageExampleEndpointPath} endpoint.`}
                >
                  For other model types, consult the MaaS documentation.
                </Alert>
              )}
            </Form>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button key="close" variant="primary" onClick={onClose} data-testid="access-details-close">
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AccessDetailsModal;
