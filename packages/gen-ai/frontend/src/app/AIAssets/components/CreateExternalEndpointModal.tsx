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
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  AIModel,
  ExternalModelRequest,
  ExternalModelResponse,
  VerifyExternalModelRequest,
  VerifyExternalModelResponse,
} from '~/app/types';
import { isClusterLocalURL } from '~/app/utilities/utils';
import useGenAiDashboardConfig from '~/app/hooks/useGenAiDashboardConfig';

const MODEL_TYPE_LLM = 'llm' as const;
const MODEL_TYPE_EMBEDDING = 'embedding' as const;

type CreateExternalEndpointModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSubmit: (request: ExternalModelRequest) => Promise<ExternalModelResponse>;
  onVerify: (request: VerifyExternalModelRequest) => Promise<VerifyExternalModelResponse>;
  existingModels: AIModel[];
};

type ModelTypeOption = {
  value: ExternalModelRequest['model_type'];
  label: string;
  description: string;
};

const MODEL_TYPE_OPTIONS: ModelTypeOption[] = [
  {
    value: MODEL_TYPE_LLM,
    label: 'Inferencing model',
    description: 'Inferencing models generate text responses and are used in the Playground.',
  },
  {
    value: MODEL_TYPE_EMBEDDING,
    label: 'Embedding model',
    description: 'Embedding models convert text to vectors and are used in RAG pipelines.',
  },
];

const CreateExternalEndpointModal: React.FC<CreateExternalEndpointModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSubmit,
  onVerify,
  existingModels,
}) => {
  const genAiConfig = useGenAiDashboardConfig();
  const clusterDomains = React.useMemo(
    () => genAiConfig?.aiAssetCustomEndpoints?.clusterDomains ?? [],
    [genAiConfig],
  );
  const allowExternalEndpoints = genAiConfig?.aiAssetCustomEndpoints?.externalProviders ?? false;

  // Form fields
  const [modelType, setModelType] =
    React.useState<ExternalModelRequest['model_type']>(MODEL_TYPE_LLM);
  const [modelId, setModelId] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [endpointUrl, setEndpointUrl] = React.useState('');
  const [token, setToken] = React.useState('');
  const [useCases, setUseCases] = React.useState('');
  const [embeddingDimension, setEmbeddingDimension] = React.useState('');

  // Dropdown states
  const [isModelTypeOpen, setIsModelTypeOpen] = React.useState(false);

  // Touched state for validation
  const [touched, setTouched] = React.useState({
    modelId: false,
    displayName: false,
    endpointUrl: false,
    token: false,
    embeddingDimension: false,
  });

  // Submission state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();

  // Verification state
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [verificationResult, setVerificationResult] = React.useState<{
    success: boolean;
    message: string;
    code?: string;
  } | null>(null);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setModelType(MODEL_TYPE_LLM);
      setModelId('');
      setDisplayName('');
      setEndpointUrl('');
      setToken('');
      setUseCases('');
      setEmbeddingDimension('');
      setTouched({
        modelId: false,
        displayName: false,
        endpointUrl: false,
        token: false,
        embeddingDimension: false,
      });
      setIsSubmitting(false);
      setError(undefined);
      setVerificationResult(null);
    }
  }, [isOpen]);

  // Clear verification when key fields change
  React.useEffect(() => {
    setVerificationResult(null);
  }, [modelId, endpointUrl, token, modelType]);

  // Conflict validation
  const modelIdConflict = React.useMemo(() => {
    const trimmedId = modelId.trim();
    if (!trimmedId) {
      return null;
    }
    return existingModels.find((m) => m.model_id === trimmedId);
  }, [modelId, existingModels]);

  const displayNameConflict = React.useMemo(() => {
    const trimmedDisplayName = displayName.trim();
    if (!trimmedDisplayName) {
      return null;
    }
    return existingModels.find((m) => m.display_name === trimmedDisplayName);
  }, [displayName, existingModels]);

  // URL validation
  const urlValidation = React.useMemo(() => {
    const trimmedUrl = endpointUrl.trim();
    if (!trimmedUrl) {
      return { isValid: true, error: null };
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmedUrl);
    } catch {
      return { isValid: false, error: 'URL must start with http:// or https://' };
    }

    if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || !parsed.hostname) {
      return { isValid: false, error: 'URL must start with http:// or https://' };
    }

    // Check if external endpoints are allowed
    const isExternal = !isClusterLocalURL(trimmedUrl, clusterDomains);
    if (!allowExternalEndpoints && isExternal) {
      return {
        isValid: false,
        error: `Model endpoints must be internal to the cluster.`,
      };
    }

    return { isValid: true, error: null };
  }, [endpointUrl, clusterDomains, allowExternalEndpoints]);

  const hasUrlError = !urlValidation.isValid;

  // Validation
  const isFormValid =
    modelId.trim() !== '' &&
    displayName.trim() !== '' &&
    endpointUrl.trim() !== '' &&
    !modelIdConflict &&
    !displayNameConflict &&
    !hasUrlError &&
    (modelType === MODEL_TYPE_LLM ||
      (embeddingDimension.trim() !== '' && parseInt(embeddingDimension, 10) > 0));

  const getUserFriendlyMessage = (code?: string, message?: string): string => {
    switch (code) {
      case 'CONNECTION_FAILED':
        return 'Connection failed. Check the URL and network connectivity.';
      case 'TIMEOUT':
        return 'Request timed out. The endpoint is not responding.';
      case 'UNAUTHORIZED':
        return 'Authentication failed. Check your API key.';
      case 'NOT_OPENAI_COMPATIBLE':
        return 'API is not OpenAI-compatible. Response missing required fields.';
      default:
        return message || 'Verification failed. Please check your configuration.';
    }
  };

  const isModArchError = (err: unknown): err is { error?: { code?: string; message?: string } } =>
    Boolean(err && typeof err === 'object' && 'error' in err);

  const handleVerify = React.useCallback(async () => {
    // Build verification request
    const request: VerifyExternalModelRequest = {
      model_id: modelId.trim(),
      base_url: endpointUrl.trim(),
      secret_value: token.trim(),
      model_type: modelType,
      ...(modelType === MODEL_TYPE_EMBEDDING &&
        embeddingDimension.trim() && {
          embedding_dimension: parseInt(embeddingDimension.trim(), 10),
        }),
    };

    setIsVerifying(true);
    setVerificationResult(null);

    const trackingModelType = modelType === MODEL_TYPE_EMBEDDING ? 'embedding' : 'inference';
    try {
      await onVerify(request);
      setVerificationResult({
        success: true,
        message: 'Model verified successfully',
      });
      fireMiscTrackingEvent('Available Endpoints Create Endpoint Verified', {
        success: true,
        modelType: trackingModelType,
      });
    } catch (err: unknown) {
      // Parse error response - mod-arch-core structures errors as { error: { code, message } }
      const errorData = isModArchError(err) ? err.error : undefined;

      setVerificationResult({
        success: false,
        message: getUserFriendlyMessage(errorData?.code, errorData?.message),
        code: errorData?.code,
      });
      fireMiscTrackingEvent('Available Endpoints Create Endpoint Verified', {
        success: false,
        modelType: trackingModelType,
      });
    } finally {
      setIsVerifying(false);
    }
  }, [modelId, endpointUrl, token, modelType, embeddingDimension, onVerify]);

  const handleSubmit = React.useCallback(async () => {
    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);
    setError(undefined);

    const trackingModelType = modelType === MODEL_TYPE_EMBEDDING ? 'embedding' : 'inference';
    const wasVerified = verificationResult !== null;
    const hasUseCase = useCases.trim() !== '';

    try {
      const request: ExternalModelRequest = {
        model_id: modelId.trim(),
        model_display_name: displayName.trim(),
        base_url: endpointUrl.trim(),
        secret_value: token.trim(),
        model_type: modelType,
        ...(useCases.trim() && { use_cases: useCases.trim() }),
        ...(modelType === MODEL_TYPE_EMBEDDING &&
          embeddingDimension.trim() && {
            embedding_dimension: parseInt(embeddingDimension.trim(), 10),
          }),
      };

      await onSubmit(request);
      fireMiscTrackingEvent('Available Endpoints Create Endpoint Submitted', {
        outcome: 'submit',
        success: true,
        modelType: trackingModelType,
        wasVerified,
        hasUseCase,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create external endpoint'));
      fireMiscTrackingEvent('Available Endpoints Create Endpoint Submitted', {
        outcome: 'submit',
        success: false,
        modelType: trackingModelType,
        wasVerified,
        hasUseCase,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isFormValid,
    modelId,
    displayName,
    endpointUrl,
    token,
    modelType,
    useCases,
    embeddingDimension,
    verificationResult,
    onSubmit,
    onSuccess,
    onClose,
  ]);

  const selectedModelTypeOption = MODEL_TYPE_OPTIONS.find((opt) => opt.value === modelType);
  const modelTypeLabel = selectedModelTypeOption?.label || 'Select model type';
  const modelTypeDescription = selectedModelTypeOption?.description || '';

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={() => {
        fireMiscTrackingEvent('Available Endpoints Create Endpoint Submitted', {
          outcome: 'cancel',
        });
        onClose();
      }}
      data-testid="create-external-model-modal"
    >
      <ModalHeader title="Create endpoint" />
      <ModalBody>
        {error && (
          <Alert
            variant="danger"
            isInline
            title="Failed to create external endpoint"
            className="pf-v6-u-mb-md"
            data-testid="create-external-model-error-alert"
          >
            {error.message}
          </Alert>
        )}
        <Alert
          variant="info"
          isInline
          title="Keys and tokens are visible to users who have access to the project."
          style={{ marginBottom: '1rem' }}
        />
        <Alert
          variant="info"
          isInline
          title={
            modelType === MODEL_TYPE_EMBEDDING
              ? 'This model must expose an OpenAI-compatible embeddings API.'
              : 'This model must expose an OpenAI-compatible chat/completions API.'
          }
          style={{ marginBottom: '1rem' }}
        >
          {modelType === MODEL_TYPE_EMBEDDING
            ? 'Embedding models convert text into numerical vectors for semantic search, RAG pipelines, and retrieval workflows.'
            : 'Most major providers support the OpenAI format. It is required for the playground and other features.'}
        </Alert>
        <Form>
          <FormGroup label="Model type" isRequired fieldId="model-type">
            <Select
              id="model-type"
              isOpen={isModelTypeOpen}
              selected={modelType}
              onSelect={(_event, value) => {
                if (value === MODEL_TYPE_LLM || value === MODEL_TYPE_EMBEDDING) {
                  setModelType(value);
                  fireMiscTrackingEvent('Available Endpoints Create Endpoint Embedding Toggled', {
                    isEmbedding: value === MODEL_TYPE_EMBEDDING,
                  });
                }
                setIsModelTypeOpen(false);
              }}
              onOpenChange={(nextOpen) => setIsModelTypeOpen(nextOpen)}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsModelTypeOpen(!isModelTypeOpen)}
                  isFullWidth
                  data-testid="create-external-model-type-select"
                  isDisabled={isVerifying || isSubmitting}
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
                <HelperTextItem>{modelTypeDescription}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup label="Model ID" isRequired fieldId="model-id">
            <TextInput
              isRequired
              type="text"
              id="model-id"
              name="model-id"
              value={modelId}
              onChange={(_event, value) => setModelId(value)}
              onBlur={() => setTouched({ ...touched, modelId: true })}
              validated={
                touched.modelId && (!modelId.trim() || modelIdConflict) ? 'error' : 'default'
              }
              isDisabled={isVerifying || isSubmitting}
              placeholder={
                modelType === MODEL_TYPE_EMBEDDING
                  ? 'Example: text-embedding-3-small, BAAI/bge-large-en-v1.5'
                  : 'Example: gpt-4o, meta-llama/Llama-3.1-8B-Instruct'
              }
              data-testid="create-external-model-id-input"
            />
            <FormHelperText>
              <HelperText>
                {touched.modelId && modelIdConflict ? (
                  <HelperTextItem variant="error">
                    {`Model ID "${modelId.trim()}" is already in use.`}
                  </HelperTextItem>
                ) : (
                  <>
                    <HelperTextItem>
                      The ID given by the model provider. This can usually be found in the
                      provider&apos;s API documentation or model catalog.
                    </HelperTextItem>
                    <HelperTextItem>Case-sensitive</HelperTextItem>
                  </>
                )}
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup label="Display name" isRequired fieldId="display-name">
            <TextInput
              isRequired
              type="text"
              id="display-name"
              name="display-name"
              value={displayName}
              onChange={(_event, value) => setDisplayName(value)}
              onBlur={() => setTouched({ ...touched, displayName: true })}
              validated={
                touched.displayName && (!displayName.trim() || displayNameConflict)
                  ? 'error'
                  : 'default'
              }
              isDisabled={isVerifying || isSubmitting}
              placeholder="Example: Customer Support GPT-4o, Code Review Claude"
              data-testid="create-external-model-display-name-input"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem
                  variant={
                    touched.displayName && (!displayName.trim() || displayNameConflict)
                      ? 'error'
                      : 'default'
                  }
                >
                  {touched.displayName && !displayName.trim()
                    ? 'Display name is required.'
                    : touched.displayName && displayNameConflict
                      ? `Display name "${displayName.trim()}" is already in use.`
                      : 'A unique name to identify this endpoint. This helps distinguish multiple endpoints that use the same underlying model.'}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          {modelType === MODEL_TYPE_EMBEDDING && (
            <FormGroup label="Embedding dimension" isRequired fieldId="embedding-dimension">
              <TextInput
                isRequired
                type="number"
                id="embedding-dimension"
                name="embedding-dimension"
                value={embeddingDimension}
                onChange={(_event, value) => setEmbeddingDimension(value)}
                onBlur={() => setTouched({ ...touched, embeddingDimension: true })}
                validated={
                  touched.embeddingDimension &&
                  (!embeddingDimension.trim() || parseInt(embeddingDimension, 10) <= 0)
                    ? 'error'
                    : 'default'
                }
                isDisabled={isVerifying || isSubmitting}
                placeholder="Example: 768, 1536, 3072"
                data-testid="create-external-model-embedding-dimension-input"
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>The output vector size for this embedding model.</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          )}

          <FormGroup label="Endpoint URL" isRequired fieldId="endpoint-url">
            <TextInput
              isRequired
              type="url"
              id="endpoint-url"
              name="endpoint-url"
              value={endpointUrl}
              onChange={(_event, value) => setEndpointUrl(value)}
              onBlur={() => setTouched({ ...touched, endpointUrl: true })}
              validated={
                touched.endpointUrl && (!endpointUrl.trim() || hasUrlError) ? 'error' : 'default'
              }
              isDisabled={isVerifying || isSubmitting}
              placeholder="Example: https://api.openai.com/v1"
              data-testid="create-external-model-url-input"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant={touched.endpointUrl && hasUrlError ? 'error' : 'default'}>
                  {touched.endpointUrl && urlValidation.error
                    ? urlValidation.error
                    : 'Type the base URL of the provider’s API. This can usually be found in the provider’s API documentation.'}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup label="API key or token" fieldId="token">
            <TextInput
              type="password"
              id="token"
              name="token"
              value={token}
              onChange={(_event, value) => setToken(value)}
              onBlur={() => setTouched({ ...touched, token: true })}
              isDisabled={isVerifying || isSubmitting}
              data-testid="create-external-model-token-input"
            />
          </FormGroup>

          {/* Verification */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Button
              variant="secondary"
              onClick={handleVerify}
              isDisabled={
                !modelId.trim() ||
                !endpointUrl.trim() ||
                !urlValidation.isValid ||
                (modelType === MODEL_TYPE_EMBEDDING &&
                  (!embeddingDimension.trim() || parseInt(embeddingDimension, 10) <= 0)) ||
                isVerifying ||
                isSubmitting
              }
              isLoading={isVerifying}
              spinnerAriaValueText={isVerifying ? 'Verifying model...' : undefined}
              data-testid="create-external-model-verify-button"
            >
              {isVerifying ? 'Verifying model...' : 'Verify model'}
            </Button>

            {verificationResult && (
              <Alert
                variant={verificationResult.success ? 'success' : 'danger'}
                isInline
                isPlain
                title={verificationResult.message}
                data-testid={
                  verificationResult.success
                    ? 'create-external-model-verify-success-alert'
                    : 'create-external-model-verify-error-alert'
                }
              />
            )}
          </div>

          <FormGroup label="Use case" fieldId="use-cases">
            <TextInput
              type="text"
              id="use-cases"
              name="use-cases"
              value={useCases}
              onChange={(_event, value) => setUseCases(value)}
              isDisabled={isVerifying || isSubmitting}
              placeholder={
                modelType === MODEL_TYPE_EMBEDDING
                  ? 'Example: Document search, Semantic similarity'
                  : 'Example: General chat, Code generation, Image analysis'
              }
              data-testid="create-external-model-use-cases-input"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Optionally describe what this model is best suited for.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter data-testid="create-external-model-modal-footer">
        <Button
          key="create"
          variant="primary"
          onClick={handleSubmit}
          isDisabled={!isFormValid || isSubmitting || isVerifying}
          isLoading={isSubmitting}
          spinnerAriaValueText={isSubmitting ? 'Creating...' : undefined}
          data-testid="create-external-model-submit-button"
        >
          {isSubmitting ? 'Creating...' : 'Create'}
        </Button>
        <Button
          key="cancel"
          variant="link"
          onClick={() => {
            fireMiscTrackingEvent('Available Endpoints Create Endpoint Submitted', {
              outcome: 'cancel',
            });
            onClose();
          }}
          isDisabled={isSubmitting}
          data-testid="create-external-model-cancel-button"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CreateExternalEndpointModal;
