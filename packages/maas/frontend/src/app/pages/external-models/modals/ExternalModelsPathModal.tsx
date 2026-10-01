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
  title: string;
  description: string;
  inputTitle?: string;
  subContentTitle?: string;
  subContent?: string;
};

const PathModal: React.FC<PathModalProps> = ({
  path,
  isOpen,
  onClose,
  title,
  description,
  inputTitle,
  subContentTitle,
  subContent,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} variant={ModalVariant.medium} data-testid="path-modal">
    <ModalHeader title={title} data-testid="path-modal-header" />
    <ModalBody>
      <Stack hasGutter>
        <StackItem>{description}</StackItem>
        <StackItem>
          <StackItem>{inputTitle && <strong>{inputTitle}</strong>}</StackItem>
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
        </StackItem>
        <StackItem>{subContentTitle && <strong>{subContentTitle}</strong>}</StackItem>
        <StackItem>
          <Content data-testid="path-modal-sub-content">{subContent}</Content>
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
