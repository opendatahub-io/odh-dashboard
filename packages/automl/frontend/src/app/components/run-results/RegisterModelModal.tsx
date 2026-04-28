import React from 'react';
import {
  Alert,
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  TextArea,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useMutation } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { useModelRegistriesQuery } from '~/app/hooks/useModelRegistriesQuery';
import { registerModel } from '~/app/api/modelRegistry';
import type { ModelRegistry, RegisterModelRequest } from '~/app/types';
import { useAutomlResultsContext } from '~/app/context/AutomlResultsContext';
import { useNotification } from '~/app/hooks/useNotification';

type RegisterModelModalProps = {
  onClose: () => void;
  modelName: string;
};

const RegisterModelModal: React.FC<RegisterModelModalProps> = ({ onClose, modelName }) => {
  const { namespace } = useParams<{ namespace: string }>();
  const { models, pipelineRun } = useAutomlResultsContext();
  const notification = useNotification();

  const {
    data: registriesData,
    isLoading: registriesLoading,
    isError: registriesError,
  } = useModelRegistriesQuery();

  const registries = registriesData?.model_registries ?? [];
  const readyRegistries = registries.filter((r) => r.is_ready);

  const model = models[modelName];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Record<string,T> can be undefined at runtime
  const displayName = model?.name || modelName;

  // Default description from pipeline run context
  const defaultDescription = pipelineRun?.display_name
    ? `Trained by AutoML pipeline run: ${pipelineRun.display_name}`
    : 'Trained by AutoML';

  // Form state — pre-filled via initializers; component remounts on each open
  // so no useEffect reset is needed.
  const [selectedRegistry, setSelectedRegistry] = React.useState<ModelRegistry | undefined>();
  const [registrySelectOpen, setRegistrySelectOpen] = React.useState(false);
  const [registeredModelName, setRegisteredModelName] = React.useState(displayName);
  const [modelDescription, setModelDescription] = React.useState(defaultDescription);

  // Derive validation error from current registry data to handle React Query refetches.
  // If the user selects a registry without external_url and then the data refetches
  // (e.g., operator reconciles and adds external_url), we want the error to clear
  // automatically without requiring the user to re-select.
  const registryValidationError = React.useMemo(() => {
    if (!selectedRegistry) {
      return '';
    }
    // Find the current version of the selected registry in the latest data
    const currentRegistry = readyRegistries.find((r) => r.id === selectedRegistry.id);
    if (!currentRegistry) {
      return ''; // Registry was removed
    }
    if (!currentRegistry.external_url?.trim()) {
      return 'This registry does not have an external URL configured and cannot be used for model registration.';
    }
    return '';
  }, [selectedRegistry, readyRegistries]);

  // The predictor path is a relative S3 key (e.g. "pipeline/run/.../predictor").
  // The BFF resolves the bucket, endpoint, and region from the DSPA object storage
  // config and constructs the full URI for the Model Registry.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Record<string,T> can be undefined at runtime
  const s3Path = model?.location?.predictor ?? undefined;

  const registerMutation = useMutation({
    mutationFn: async (params: {
      registryId: string;
      registryName: string;
      request: RegisterModelRequest;
    }) => {
      if (!namespace) {
        throw new Error('Namespace is not available');
      }
      return registerModel('', {
        namespace,
        registryId: params.registryId,
        request: params.request,
      });
    },
    onSuccess: (data, variables) => {
      const modelDetailsUrl = `/ai-hub/registry/${encodeURIComponent(variables.registryName)}/registered-models/${encodeURIComponent(data.registered_model_id)}/overview`;
      notification.success(`${registeredModelName.trim()} registered successfully`, undefined, [
        {
          title: 'View in model registry',
          onClick: () => window.open(modelDetailsUrl, '_blank', 'noopener,noreferrer'),
        },
      ]);
      onClose();
    },
    onError: (error: unknown) => {
      notification.error(
        'Failed to register model',
        error instanceof Error ? error.message : 'An unexpected error occurred',
      );
    },
  });

  const handleSubmit = React.useCallback(() => {
    if (!selectedRegistry || !registeredModelName.trim() || !s3Path || registryValidationError) {
      return;
    }

    /* eslint-disable camelcase -- BFF API uses snake_case */
    const request: RegisterModelRequest = {
      s3_path: s3Path,
      model_name: registeredModelName.trim(),
      version_name: 'v1',
      ...(modelDescription.trim() && { model_description: modelDescription.trim() }),
    };
    /* eslint-enable camelcase */

    registerMutation.mutate({
      registryId: selectedRegistry.id,
      registryName: selectedRegistry.name,
      request,
    });
  }, [
    selectedRegistry,
    registeredModelName,
    s3Path,
    modelDescription,
    registerMutation,
    registryValidationError,
  ]);

  const isFormValid =
    Boolean(selectedRegistry) &&
    !registryValidationError &&
    registeredModelName.trim().length > 0 &&
    Boolean(s3Path);

  const isSubmitting = registerMutation.isPending;

  return (
    <Modal isOpen onClose={onClose} variant="medium" data-testid="register-model-modal">
      <ModalHeader
        title="Register model"
        description={`Register ${displayName} to a model registry`}
      />
      <ModalBody>
        <Form>
          {registerMutation.isError && (
            <Alert
              variant="danger"
              title="Failed to register model"
              isInline
              data-testid="register-model-error"
            >
              {registerMutation.error instanceof Error
                ? registerMutation.error.message
                : 'An unknown error occurred'}
            </Alert>
          )}

          <FormGroup label="Model registry" isRequired fieldId="model-registry-select">
            {registriesLoading ? (
              <Spinner size="md" data-testid="registries-loading" />
            ) : registriesError ? (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error">Failed to load model registries</HelperTextItem>
                </HelperText>
              </FormHelperText>
            ) : readyRegistries.length === 0 ? (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="warning">
                    No model registries are available
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            ) : (
              <Select
                id="model-registry-select"
                isOpen={registrySelectOpen}
                selected={selectedRegistry?.id}
                onSelect={(_event, value) => {
                  const registry = readyRegistries.find((r) => r.id === value);
                  setSelectedRegistry(registry);
                  setRegistrySelectOpen(false);
                }}
                onOpenChange={setRegistrySelectOpen}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setRegistrySelectOpen((prev) => !prev)}
                    isExpanded={registrySelectOpen}
                    isFullWidth
                    status={registryValidationError ? 'danger' : undefined}
                    data-testid="registry-select-toggle"
                  >
                    {selectedRegistry?.display_name ?? 'Select a model registry'}
                  </MenuToggle>
                )}
                data-testid="registry-select"
              >
                <SelectList>
                  {readyRegistries.map((registry) => (
                    <SelectOption
                      key={registry.id}
                      value={registry.id}
                      description={registry.description}
                      data-testid={`registry-option-${registry.name}`}
                    >
                      {registry.display_name}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            )}
            {registryValidationError && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem
                    variant="error"
                    icon={<ExclamationCircleIcon />}
                    data-testid="registry-validation-error"
                  >
                    {registryValidationError}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </FormGroup>

          <FormGroup label="Model name" isRequired fieldId="model-name-input">
            <TextInput
              id="model-name-input"
              value={registeredModelName}
              onChange={(_event, value) => setRegisteredModelName(value)}
              isDisabled={isSubmitting}
              validated={registeredModelName.trim().length === 0 ? 'error' : 'default'}
              data-testid="model-name-input"
            />
            {registeredModelName.trim().length === 0 && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error">Model name is required</HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </FormGroup>

          <FormGroup label="Model description" fieldId="model-description-input">
            <TextArea
              id="model-description-input"
              value={modelDescription}
              onChange={(_event, value) => setModelDescription(value)}
              isDisabled={isSubmitting}
              resizeOrientation="vertical"
              data-testid="model-description-input"
            />
          </FormGroup>

          <FormGroup label="Model artifact location" isRequired fieldId="s3-path-display">
            {s3Path ? (
              <Tooltip content={s3Path}>
                <TextInput
                  id="s3-path-display"
                  value={s3Path}
                  isDisabled
                  data-testid="s3-path-display"
                />
              </Tooltip>
            ) : (
              <TextInput
                id="s3-path-display"
                value=""
                isDisabled
                validated="error"
                data-testid="s3-path-display"
              />
            )}
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant={s3Path ? 'default' : 'error'}>
                  {s3Path
                    ? 'The S3 path where the trained model is stored'
                    : 'No predictor path available for this model'}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isDisabled={!isFormValid || isSubmitting}
          isLoading={isSubmitting}
          data-testid="register-model-submit"
        >
          Register
        </Button>
        <Button
          variant="link"
          onClick={onClose}
          isDisabled={isSubmitting}
          data-testid="register-model-cancel"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default RegisterModelModal;
