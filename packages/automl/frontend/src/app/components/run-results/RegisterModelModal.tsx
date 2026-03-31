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
import { useMutation } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { useModelRegistriesQuery } from '~/app/hooks/useModelRegistriesQuery';
import { registerModel } from '~/app/api/modelRegistry';
import type { ModelRegistry, RegisterModelRequest } from '~/app/types';
import { useAutomlResultsContext } from '~/app/context/AutomlResultsContext';

type RegisterModelModalProps = {
  onClose: () => void;
  modelName: string;
};

const RegisterModelModal: React.FC<RegisterModelModalProps> = ({ onClose, modelName }) => {
  const { namespace } = useParams<{ namespace: string }>();
  const { models, pipelineRun } = useAutomlResultsContext();

  const {
    data: registriesData,
    isLoading: registriesLoading,
    isError: registriesError,
  } = useModelRegistriesQuery();

  const registries = registriesData?.model_registries ?? [];
  const readyRegistries = registries.filter((r) => r.is_ready);

  // Default description from pipeline run context
  const defaultDescription = pipelineRun?.display_name
    ? `Trained by AutoML pipeline run: ${pipelineRun.display_name}`
    : 'Trained by AutoML';

  // Form state — pre-filled via initializers; component remounts on each open
  // so no useEffect reset is needed.
  const [selectedRegistry, setSelectedRegistry] = React.useState<ModelRegistry | undefined>();
  const [registrySelectOpen, setRegistrySelectOpen] = React.useState(false);
  const [registeredModelName, setRegisteredModelName] = React.useState(modelName);
  const [modelDescription, setModelDescription] = React.useState(defaultDescription);

  const model = models[modelName];
  // The predictor path is a relative S3 key (e.g. "pipeline/run/.../predictor").
  // The BFF resolves the bucket from the DSPA object-storage config, so only
  // the key is needed here — not a full s3://bucket/key URI.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Record<string,T> can be undefined at runtime
  const s3Path = model?.location?.predictor ?? undefined;

  const registerMutation = useMutation({
    mutationFn: async (params: { registryId: string; request: RegisterModelRequest }) => {
      if (!namespace) {
        throw new Error('Namespace is not available');
      }
      return registerModel('', {
        namespace,
        registryId: params.registryId,
        request: params.request,
      });
    },
    onSuccess: () => {
      onClose();
    },
  });

  const handleSubmit = React.useCallback(() => {
    if (!selectedRegistry || !registeredModelName.trim() || !s3Path) {
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

    registerMutation.mutate({ registryId: selectedRegistry.id, request });
  }, [selectedRegistry, registeredModelName, s3Path, modelDescription, registerMutation]);

  const isFormValid =
    Boolean(selectedRegistry) && registeredModelName.trim().length > 0 && Boolean(s3Path);

  const isSubmitting = registerMutation.isPending;

  return (
    <Modal isOpen onClose={onClose} variant="medium" data-testid="register-model-modal">
      <ModalHeader
        title="Register model"
        description={`Register ${modelName} to a model registry`}
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
          </FormGroup>

          <FormGroup label="Model name" isRequired fieldId="model-name-input">
            <TextInput
              id="model-name-input"
              value={registeredModelName}
              onChange={(_event, value) => setRegisteredModelName(value)}
              isDisabled={isSubmitting}
              data-testid="model-name-input"
            />
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

          {s3Path && (
            <FormGroup label="Model artifact location" fieldId="s3-path-display">
              <Tooltip content={s3Path}>
                <TextInput
                  id="s3-path-display"
                  value={s3Path}
                  isDisabled
                  data-testid="s3-path-display"
                />
              </Tooltip>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>The S3 path where the trained model is stored</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          )}
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
