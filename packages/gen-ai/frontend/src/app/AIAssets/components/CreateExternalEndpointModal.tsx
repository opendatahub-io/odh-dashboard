/* eslint-disable camelcase */
import * as React from 'react';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  TextInput,
  Alert,
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  Button,
} from '@patternfly/react-core';
import { FieldGroupHelpLabelIcon } from 'mod-arch-shared';
import { ExternalModelRequest, ExternalModelResponse } from '~/app/types';

type CreateExternalEndpointModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSubmit: (request: ExternalModelRequest) => Promise<ExternalModelResponse>;
};

type ProviderTypeOption = {
  value: ExternalModelRequest['provider_type'];
  label: string;
  description: string;
};

type ModelTypeOption = {
  value: ExternalModelRequest['model_type'];
  label: string;
  description: string;
};

const PROVIDER_TYPE_OPTIONS: ProviderTypeOption[] = [
  { value: 'remote::vllm', label: 'Internal', description: 'Self-hosted vLLM model deployments' },
  { value: 'remote::openai', label: 'OpenAI', description: 'GPT models, o-series, DALL-E' },
  {
    value: 'remote::gemini',
    label: 'Google Gemini',
    description: 'Gemini models, text embeddings',
  },
  { value: 'remote::anthropic', label: 'Anthropic', description: 'Claude models' },
  {
    value: 'remote::passthrough',
    label: 'Other (OpenAI-compatible)',
    description: 'Any provider with an OpenAI-compatible API',
  },
];

const MODEL_TYPE_OPTIONS: ModelTypeOption[] = [
  {
    value: 'llm',
    label: 'Inferencing model',
    description: 'Chat, completion, and reasoning models',
  },
  {
    value: 'embedding',
    label: 'Embedding model',
    description: 'Text vectorization for RAG and retrieval',
  },
];

const isValidProviderType = (value: unknown): value is ExternalModelRequest['provider_type'] => {
  const validProviders = [
    'remote::vllm',
    'remote::openai',
    'remote::anthropic',
    'remote::gemini',
    'remote::passthrough',
  ];
  return typeof value === 'string' && validProviders.includes(value);
};

const CreateExternalEndpointModal: React.FC<CreateExternalEndpointModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSubmit,
}) => {
  // Form fields
  const [modelType, setModelType] = React.useState<ExternalModelRequest['model_type']>('llm');
  const [providerType, setProviderType] =
    React.useState<ExternalModelRequest['provider_type']>('remote::vllm');
  const [modelId, setModelId] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [endpointUrl, setEndpointUrl] = React.useState('');
  const [token, setToken] = React.useState('');
  const [useCases, setUseCases] = React.useState('');

  // Dropdown states
  const [isModelTypeOpen, setIsModelTypeOpen] = React.useState(false);
  const [isProviderTypeOpen, setIsProviderTypeOpen] = React.useState(false);

  // Touched state for validation
  const [touched, setTouched] = React.useState({
    modelId: false,
    endpointUrl: false,
    token: false,
  });

  // Submission state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setModelType('llm');
      setProviderType('remote::vllm');
      setModelId('');
      setDisplayName('');
      setEndpointUrl('');
      setToken('');
      setUseCases('');
      setTouched({ modelId: false, endpointUrl: false, token: false });
      setIsSubmitting(false);
      setError(undefined);
    }
  }, [isOpen]);

  // Validation
  const isFormValid = modelId.trim() !== '' && endpointUrl.trim() !== '' && token.trim() !== '';

  const handleSubmit = React.useCallback(async () => {
    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);
    setError(undefined);

    try {
      const request: ExternalModelRequest = {
        model_id: modelId.trim(),
        model_display_name: displayName.trim() || modelId.trim(),
        base_url: endpointUrl.trim(),
        secret_value: token.trim(),
        provider_type: providerType,
        model_type: modelType,
        ...(useCases.trim() && { use_cases: useCases.trim() }),
      };

      await onSubmit(request);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create external endpoint'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isFormValid,
    modelId,
    displayName,
    endpointUrl,
    token,
    providerType,
    modelType,
    useCases,
    onSubmit,
    onSuccess,
    onClose,
  ]);

  const modelTypeLabel =
    MODEL_TYPE_OPTIONS.find((opt) => opt.value === modelType)?.label || 'Select model type';
  const providerTypeLabel =
    PROVIDER_TYPE_OPTIONS.find((opt) => opt.value === providerType)?.label ||
    'Select provider type';

  return (
    <Modal variant={ModalVariant.medium} isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Create external endpoint" />
      <ModalBody>
        {error && (
          <Alert
            variant="danger"
            isInline
            title="Failed to create external endpoint"
            className="pf-v6-u-mb-md"
          >
            {error.message}
          </Alert>
        )}
        <Alert
          variant="warning"
          isInline
          title="Keys and tokens you add are shared at the project level."
          style={{ marginBottom: '1rem' }}
        >
          Anyone with access to this project can use them.
        </Alert>
        <Alert
          variant="info"
          isInline
          title="This model must expose an OpenAI-compatible chat/completions API."
          style={{ marginBottom: '1rem' }}
        >
          Most major providers support the OpenAI format. It is required for the playground and
          other features.
        </Alert>
        <Form>
          <FormGroup label="Model type" isRequired fieldId="model-type">
            <Select
              id="model-type"
              isOpen={isModelTypeOpen}
              selected={modelType}
              onSelect={(_event, value) => {
                if (value === 'llm' || value === 'embedding') {
                  setModelType(value);
                }
                setIsModelTypeOpen(false);
              }}
              onOpenChange={(nextOpen) => setIsModelTypeOpen(nextOpen)}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsModelTypeOpen(!isModelTypeOpen)}
                  isFullWidth
                >
                  {modelTypeLabel}
                </MenuToggle>
              )}
            >
              <SelectList>
                {MODEL_TYPE_OPTIONS.map((option) => (
                  <SelectOption
                    key={option.value}
                    value={option.value}
                    description={option.description}
                  >
                    {option.label}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Inferencing models generate text responses and are used in the Playground.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup label="Provider" isRequired fieldId="provider-type">
            <Select
              id="provider-type"
              isOpen={isProviderTypeOpen}
              selected={providerType}
              onSelect={(_event, value) => {
                if (isValidProviderType(value)) {
                  setProviderType(value);
                }
                setIsProviderTypeOpen(false);
              }}
              onOpenChange={(nextOpen) => setIsProviderTypeOpen(nextOpen)}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsProviderTypeOpen(!isProviderTypeOpen)}
                  isFullWidth
                >
                  {providerTypeLabel}
                </MenuToggle>
              )}
            >
              <SelectList>
                {PROVIDER_TYPE_OPTIONS.map((option) => (
                  <SelectOption
                    key={option.value}
                    value={option.value}
                    description={option.description}
                  >
                    {option.label}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
            <FormHelperText>
              <HelperText>
                <HelperTextItem>The cloud provider hosting this model.</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup
            label="Model ID"
            isRequired
            fieldId="model-id"
            labelHelp={
              <FieldGroupHelpLabelIcon
                content={
                  <p>
                    Enter the exact model identifier from your provider (e.g., gpt-4o,
                    claude-sonnet-4-20250514, meta-llama/Llama-31-8B-Instruct). This must match the
                    provider&apos;s model ID exactly. You can usually find this in your
                    provider&apos;s API documentation or model catalog.
                  </p>
                }
              />
            }
          >
            <TextInput
              isRequired
              type="text"
              id="model-id"
              name="model-id"
              value={modelId}
              onChange={(_event, value) => setModelId(value)}
              onBlur={() => setTouched({ ...touched, modelId: true })}
              validated={touched.modelId && !modelId.trim() ? 'error' : 'default'}
              placeholder="e.g. gpt-4o, meta-llama/Llama-3.1-8B-Instruct"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  The verbatim model ID from your provider. Must match exactly.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup
            label="Display name"
            fieldId="display-name"
            labelHelp={
              <FieldGroupHelpLabelIcon
                content={
                  <p>
                    An optional friendly name shown in tables and selectors instead of the verbatim
                    model ID. For example, you might name it Our GPT-4o or Team Llama. If left
                    blank, the model ID will be used.
                  </p>
                }
              />
            }
          >
            <TextInput
              type="text"
              id="display-name"
              name="display-name"
              value={displayName}
              onChange={(_event, value) => setDisplayName(value)}
              placeholder="e.g. Our GPT-4o, Team Llama"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>Optional. A friendly display name for this model.</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup
            label="URL"
            isRequired
            fieldId="endpoint-url"
            labelHelp={
              <FieldGroupHelpLabelIcon
                content={
                  <p>
                    The base URL of the API endpoint. For OpenAI, this is typically
                    https://api.openai.com/v1. For other providers, check their API documentation
                    for the correct base URL.
                  </p>
                }
              />
            }
          >
            <TextInput
              isRequired
              type="url"
              id="endpoint-url"
              name="endpoint-url"
              value={endpointUrl}
              onChange={(_event, value) => setEndpointUrl(value)}
              onBlur={() => setTouched({ ...touched, endpointUrl: true })}
              validated={touched.endpointUrl && !endpointUrl.trim() ? 'error' : 'default'}
              placeholder="e.g. https://api.openai.com/v1"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>The endpoint URL for this model.</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup label="Token" isRequired fieldId="token">
            <TextInput
              isRequired
              type="password"
              id="token"
              name="token"
              value={token}
              onChange={(_event, value) => setToken(value)}
              onBlur={() => setTouched({ ...touched, token: true })}
              validated={touched.token && !token.trim() ? 'error' : 'default'}
              placeholder="Your API key or token"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>Your API key or the token for this endpoint.</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup label="Use case" fieldId="use-cases">
            <TextInput
              type="text"
              id="use-cases"
              name="use-cases"
              value={useCases}
              onChange={(_event, value) => setUseCases(value)}
              placeholder="e.g. General chat, Code generation, Image analysis"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Optional. Helps others identify what this model is best suited for.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          key="create"
          variant="primary"
          onClick={handleSubmit}
          isDisabled={!isFormValid || isSubmitting}
          isLoading={isSubmitting}
          spinnerAriaValueText={isSubmitting ? 'Creating...' : undefined}
        >
          {isSubmitting ? 'Creating...' : 'Create'}
        </Button>
        <Button key="cancel" variant="link" onClick={onClose} isDisabled={isSubmitting}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CreateExternalEndpointModal;
