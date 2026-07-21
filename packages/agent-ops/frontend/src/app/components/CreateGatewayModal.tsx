import * as React from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { useMutation } from '@tanstack/react-query';
import type { APIOptions } from 'mod-arch-core';
import { createGateway } from '~/app/api/gateways';
import type { CreateGatewayRequest } from '~/app/types/gateway';

type CreateGatewayModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
};

const CreateGatewayModal: React.FC<CreateGatewayModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = React.useState('');
  const [endpoint, setEndpoint] = React.useState('');
  const [namespace, setNamespace] = React.useState('');
  const [isGlobal, setIsGlobal] = React.useState(false);

  const resetForm = React.useCallback(() => {
    setName('');
    setEndpoint('');
    setNamespace('');
    setIsGlobal(false);
  }, []);

  const { mutate, isPending, error } = useMutation({
    mutationKey: ['agent-ops', 'createGateway'],
    mutationFn: async (request: CreateGatewayRequest) => {
      const apiOpts: APIOptions = {};
      return createGateway('')(apiOpts, request);
    },
    onSuccess: () => {
      resetForm();
      onCreated();
    },
    retry: false,
  });

  const handleSubmit = React.useCallback(() => {
    const request: CreateGatewayRequest = {
      name: name.trim(),
      endpoint: endpoint.trim(),
    };
    const trimmedNamespace = namespace.trim();
    if (trimmedNamespace) {
      request.namespace = trimmedNamespace;
    }
    if (isGlobal) {
      request.isGlobal = true;
    }
    mutate(request);
  }, [name, endpoint, namespace, isGlobal, mutate]);

  const isValid = name.trim().length > 0 && endpoint.trim().length > 0;

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
      data-testid="create-gateway-modal"
    >
      <ModalHeader title="Register gateway" />
      <ModalBody>
        <Stack hasGutter>
          {error ? (
            <StackItem>
              <Alert
                variant="danger"
                title="Failed to register gateway"
                isInline
                data-testid="create-gateway-error"
              >
                {error instanceof Error ? error.message : 'An unexpected error occurred.'}
              </Alert>
            </StackItem>
          ) : null}
          <StackItem>
            <Form>
              <FormGroup label="Name" isRequired fieldId="gateway-name">
                <TextInput
                  id="gateway-name"
                  data-testid="gateway-name-input"
                  value={name}
                  onChange={(_event, value) => setName(value)}
                  placeholder="my-gateway"
                  isDisabled={isPending}
                  isRequired
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      A unique name for this gateway registration.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
              <FormGroup label="Endpoint" isRequired fieldId="gateway-endpoint">
                <TextInput
                  id="gateway-endpoint"
                  data-testid="gateway-endpoint-input"
                  value={endpoint}
                  onChange={(_event, value) => setEndpoint(value)}
                  placeholder="http://openshell.ns.svc:8080"
                  isDisabled={isPending}
                  isRequired
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      The gRPC or HTTP endpoint of the OpenShell gateway.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
              <FormGroup label="Namespace" fieldId="gateway-namespace">
                <TextInput
                  id="gateway-namespace"
                  data-testid="gateway-namespace-input"
                  value={namespace}
                  onChange={(_event, value) => setNamespace(value)}
                  placeholder="openshell-system"
                  isDisabled={isPending}
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Optional namespace where the gateway is deployed.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
              <FormGroup fieldId="gateway-global">
                <Checkbox
                  id="gateway-global"
                  data-testid="gateway-global-checkbox"
                  label="Global gateway (available to all namespaces)"
                  isChecked={isGlobal}
                  onChange={(_event, checked) => setIsGlobal(checked)}
                  isDisabled={isPending}
                />
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
          data-testid="create-gateway-submit"
        >
          Register
        </Button>
        <Button
          variant="link"
          onClick={handleClose}
          isDisabled={isPending}
          data-testid="create-gateway-cancel"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CreateGatewayModal;
