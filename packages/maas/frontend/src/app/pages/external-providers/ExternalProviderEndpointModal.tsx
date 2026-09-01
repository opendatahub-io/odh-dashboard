import React from 'react';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Stack,
  StackItem,
  InputGroup,
  InputGroupItem,
  TextInput,
  Content,
} from '@patternfly/react-core';
import {
  convertStringToAuthMechanism,
  mapAuthMechanismToHumanReadable,
} from '~/app/pages/external-models/utils';

type ExternalProviderEndpointModalProps = {
  endpointURL: string;
  isOpen: boolean;
  onClose: () => void;
  authentication: string;
};

const ExternalProviderEndpointModal: React.FC<ExternalProviderEndpointModalProps> = ({
  endpointURL,
  isOpen,
  onClose,
  authentication,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    variant={ModalVariant.medium}
    data-testid="provider-url-modal"
  >
    <ModalHeader title="Endpoints" data-testid="external-provider-endpoint-modal-header" />
    <ModalBody>
      <Stack hasGutter>
        <StackItem>
          Use the following URL endpoint to connect this provider to your application.
        </StackItem>
        <StackItem>
          <strong>External API endpoint</strong>
          <InputGroup>
            <InputGroupItem isFill>
              <TextInput
                value={endpointURL}
                readOnly
                dir="ltr"
                data-testid="external-provider-endpoint-modal-input-value"
              />
            </InputGroupItem>
          </InputGroup>
        </StackItem>
        <StackItem>
          <strong>Authentication</strong>
        </StackItem>
        <StackItem>
          <Content data-testid="external-provider-endpoint-modal-authentication-content">
            {mapAuthMechanismToHumanReadable(convertStringToAuthMechanism(authentication))}
          </Content>
        </StackItem>
      </Stack>
    </ModalBody>
    <ModalFooter>
      <Button
        variant="primary"
        onClick={onClose}
        data-testid="external-provider-endpoint-modal-close-button"
      >
        Close
      </Button>
    </ModalFooter>
  </Modal>
);

export default ExternalProviderEndpointModal;
