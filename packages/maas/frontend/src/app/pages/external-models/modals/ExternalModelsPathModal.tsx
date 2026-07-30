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

type PathModalProps = {
  path: string;
  isOpen: boolean;
  onClose: () => void;
  providerRef: string;
};

const PathModal: React.FC<PathModalProps> = ({ path, isOpen, onClose, providerRef }) => (
  <Modal isOpen={isOpen} onClose={onClose} variant={ModalVariant.medium} data-testid="path-modal">
    <ModalHeader title="Path" data-testid="path-modal-header" />
    <ModalBody>
      <Stack hasGutter>
        <StackItem>
          The request path appended to the provider URL. If path variables were configured,
          they&apos;re shown with resolved values.
        </StackItem>
        <StackItem>
          <InputGroup>
            <InputGroupItem isFill>
              <TextInput
                value={path}
                readOnly
                dir="ltr"
                isDisabled
                data-testid="path-modal-input-value"
              />
            </InputGroupItem>
          </InputGroup>
        </StackItem>
        <StackItem>
          <strong>Provider</strong>
        </StackItem>
        <StackItem>
          <Content data-testid="path-modal-provider-ref-content">{providerRef}</Content>
        </StackItem>
      </Stack>
    </ModalBody>
    <ModalFooter>
      <Button variant="primary" onClick={onClose} data-testid="path-modal-close-button">
        Close
      </Button>
    </ModalFooter>
  </Modal>
);

export default PathModal;
