import * as React from 'react';
import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';
import { useMutation } from '@tanstack/react-query';
import { type APIOptions, useFetchState, type FetchStateCallbackPromise } from 'mod-arch-core';
import { useGatewayContext } from '~/app/context/GatewayContext';
import { deployAgent } from '~/app/api/deployAgent';
import { listProviders } from '~/app/api/providers';
import type { DeployAgentRequest } from '~/app/types/deployAgent';
import type { Provider } from '~/app/types/provider';

type EnvVarRow = {
  key: string;
  value: string;
};

type DeploySandboxModalProps = {
  isOpen: boolean;
  namespace: string;
  onClose: () => void;
  onDeployed: () => void;
};

const DeploySandboxModal: React.FC<DeploySandboxModalProps> = ({
  isOpen,
  namespace,
  onClose,
  onDeployed,
}) => {
  const { gateways, loaded: gatewaysLoaded } = useGatewayContext();

  const [name, setName] = React.useState('');
  const [image, setImage] = React.useState('');
  const [selectedGatewayName, setSelectedGatewayName] = React.useState('');
  const [selectedProviderName, setSelectedProviderName] = React.useState('');
  const [model, setModel] = React.useState('');
  const [envVars, setEnvVars] = React.useState<EnvVarRow[]>([]);

  const fetchProviders = React.useCallback<FetchStateCallbackPromise<Provider[]>>(
    async (opts) => {
      if (!selectedGatewayName) {
        return [];
      }
      return listProviders('', selectedGatewayName)(opts);
    },
    [selectedGatewayName],
  );

  const [providers, providersLoaded] = useFetchState<Provider[]>(fetchProviders, []);

  const gatewayOptions = React.useMemo(
    () =>
      gateways.map((gw) => ({
        key: gw.name,
        label: gw.name,
        description: `${gw.status} - ${gw.providerCount} provider(s)`,
      })),
    [gateways],
  );

  const providerOptions = React.useMemo(
    () =>
      providers.map((p) => ({
        key: p.name,
        label: p.name,
        description: p.type,
      })),
    [providers],
  );

  const resetForm = React.useCallback(() => {
    setName('');
    setImage('');
    setSelectedGatewayName('');
    setSelectedProviderName('');
    setModel('');
    setEnvVars([]);
  }, []);

  const { mutate, isPending, error } = useMutation({
    mutationKey: ['agent-ops', 'deploySandbox'],
    mutationFn: async (request: DeployAgentRequest) => {
      const apiOpts: APIOptions = {};
      return deployAgent('')(apiOpts, request);
    },
    onSuccess: () => {
      resetForm();
      onDeployed();
    },
    retry: false,
  });

  const handleGatewayChange = React.useCallback((value: string) => {
    setSelectedGatewayName(value);
    setSelectedProviderName('');
  }, []);

  const handleAddEnvVar = React.useCallback(() => {
    setEnvVars((prev) => [...prev, { key: '', value: '' }]);
  }, []);

  const handleRemoveEnvVar = React.useCallback((index: number) => {
    setEnvVars((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleEnvVarChange = React.useCallback(
    (index: number, field: 'key' | 'value', newValue: string) => {
      setEnvVars((prev) =>
        prev.map((row, i) => (i === index ? { ...row, [field]: newValue } : row)),
      );
    },
    [],
  );

  const handleSubmit = React.useCallback(() => {
    const trimmedImage = image.trim();
    const colonIdx = trimmedImage.lastIndexOf(':');
    const hasTag = colonIdx > 0 && !trimmedImage.substring(colonIdx).includes('/');
    const request: DeployAgentRequest = {
      name: name.trim() || `sandbox-${Date.now()}`,
      namespace,
      containerImage: hasTag ? trimmedImage.substring(0, colonIdx) : trimmedImage,
      imageTag: hasTag ? trimmedImage.substring(colonIdx + 1) : 'latest',
    };
    if (selectedGatewayName) {
      request.gateway = selectedGatewayName;
    }
    if (selectedProviderName) {
      request.provider = selectedProviderName;
    }
    if (model.trim()) {
      request.model = model.trim();
    }
    const validEnvVars = envVars.filter((ev) => ev.key.trim().length > 0);
    if (validEnvVars.length > 0) {
      request.envVars = validEnvVars.map((ev) => ({
        name: ev.key.trim(),
        value: ev.value,
      }));
    }
    mutate(request);
  }, [name, namespace, image, selectedGatewayName, selectedProviderName, model, envVars, mutate]);

  const isValid = image.trim().length > 0;

  const handleClose = React.useCallback(() => {
    if (!isPending) {
      resetForm();
      onClose();
    }
  }, [isPending, resetForm, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="medium"
      data-testid="deploy-sandbox-modal"
    >
      <ModalHeader title="Deploy sandbox" />
      <ModalBody>
        <Stack hasGutter>
          {error ? (
            <StackItem>
              <Alert
                variant="danger"
                title="Failed to deploy sandbox"
                isInline
                data-testid="deploy-sandbox-error"
              >
                {error instanceof Error ? error.message : 'An unexpected error occurred.'}
              </Alert>
            </StackItem>
          ) : null}
          <StackItem>
            <Form>
              <FormGroup label="Name" fieldId="sandbox-name">
                <TextInput
                  id="sandbox-name"
                  data-testid="sandbox-name-input"
                  value={name}
                  onChange={(_event, value) => setName(value)}
                  placeholder="Auto-generated if empty"
                  isDisabled={isPending}
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Optional. A name will be auto-generated if left empty.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>

              <FormGroup label="Image" isRequired fieldId="sandbox-image">
                <TextInput
                  id="sandbox-image"
                  data-testid="sandbox-image-input"
                  value={image}
                  onChange={(_event, value) => setImage(value)}
                  placeholder="ghcr.io/nvidia/openshell-community/sandboxes/base:latest"
                  isDisabled={isPending}
                  isRequired
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Container image or short name (e.g., &quot;ollama&quot;).
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>

              <FormGroup label="Gateway" fieldId="sandbox-gateway">
                {!gatewaysLoaded ? (
                  <Spinner size="md" aria-label="Loading gateways" />
                ) : (
                  <SimpleSelect
                    dataTestId="sandbox-gateway-select"
                    placeholder="Select a gateway"
                    value={selectedGatewayName}
                    options={gatewayOptions}
                    onChange={handleGatewayChange}
                    isFullWidth
                    isDisabled={isPending || gateways.length === 0}
                    popperProps={{ appendTo: 'inline' }}
                    toggleProps={{
                      id: 'sandbox-gateway',
                      'aria-label': 'Gateway',
                    }}
                  />
                )}
              </FormGroup>

              <FormGroup label="Provider" fieldId="sandbox-provider">
                {selectedGatewayName && !providersLoaded ? (
                  <Spinner size="md" aria-label="Loading providers" />
                ) : (
                  <SimpleSelect
                    dataTestId="sandbox-provider-select"
                    placeholder={
                      selectedGatewayName ? 'Select a provider' : 'Select a gateway first'
                    }
                    value={selectedProviderName}
                    options={providerOptions}
                    onChange={setSelectedProviderName}
                    isFullWidth
                    isDisabled={isPending || !selectedGatewayName || providers.length === 0}
                    popperProps={{ appendTo: 'inline' }}
                    toggleProps={{
                      id: 'sandbox-provider',
                      'aria-label': 'Provider',
                    }}
                  />
                )}
              </FormGroup>

              <FormGroup label="Model" fieldId="sandbox-model">
                <TextInput
                  id="sandbox-model"
                  data-testid="sandbox-model-input"
                  value={model}
                  onChange={(_event, value) => setModel(value)}
                  placeholder="gpt-4o"
                  isDisabled={isPending}
                />
              </FormGroup>

              <FormGroup label="Environment variables" fieldId="sandbox-envvars">
                <Stack hasGutter>
                  {envVars.map((row, index) => (
                    <StackItem key={index}>
                      <Flex
                        alignItems={{ default: 'alignItemsFlexStart' }}
                        gap={{ default: 'gapSm' }}
                      >
                        <FlexItem grow={{ default: 'grow' }}>
                          <TextInput
                            aria-label={`Environment variable key ${index + 1}`}
                            data-testid={`sandbox-envvar-key-${index}`}
                            value={row.key}
                            onChange={(_event, value) =>
                              handleEnvVarChange(index, 'key', value)
                            }
                            placeholder="KEY"
                            isDisabled={isPending}
                          />
                        </FlexItem>
                        <FlexItem grow={{ default: 'grow' }}>
                          <TextInput
                            aria-label={`Environment variable value ${index + 1}`}
                            data-testid={`sandbox-envvar-value-${index}`}
                            value={row.value}
                            onChange={(_event, value) =>
                              handleEnvVarChange(index, 'value', value)
                            }
                            placeholder="value"
                            isDisabled={isPending}
                          />
                        </FlexItem>
                        <FlexItem>
                          <Button
                            variant="plain"
                            aria-label={`Remove environment variable ${index + 1}`}
                            data-testid={`sandbox-envvar-remove-${index}`}
                            onClick={() => handleRemoveEnvVar(index)}
                            isDisabled={isPending}
                            icon={<MinusCircleIcon />}
                          />
                        </FlexItem>
                      </Flex>
                    </StackItem>
                  ))}
                  <StackItem>
                    <Button
                      variant="link"
                      icon={<PlusCircleIcon />}
                      onClick={handleAddEnvVar}
                      isDisabled={isPending}
                      data-testid="sandbox-envvar-add"
                    >
                      Add environment variable
                    </Button>
                  </StackItem>
                </Stack>
              </FormGroup>
            </Form>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isDisabled={!isValid || isPending}
          isLoading={isPending}
          data-testid="deploy-sandbox-submit"
        >
          Deploy sandbox
        </Button>
        <Button
          variant="link"
          onClick={handleClose}
          isDisabled={isPending}
          data-testid="deploy-sandbox-cancel"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default DeploySandboxModal;
