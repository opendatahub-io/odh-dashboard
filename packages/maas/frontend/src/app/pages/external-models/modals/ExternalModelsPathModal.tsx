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
  ClipboardCopyButton,
  Content,
} from '@patternfly/react-core';

type PathModalProps = {
  path: string;
  isOpen: boolean;
  onClose: () => void;
  setIsCopyTipCopied: (isCopyTipCopied: boolean) => void;
  isCopyTipCopied: boolean;
  providerRef: string;
};

const PathModal: React.FC<PathModalProps> = ({
  path,
  isOpen,
  onClose,
  setIsCopyTipCopied,
  isCopyTipCopied,
  providerRef,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} variant={ModalVariant.medium} data-testid="path-modal">
    <ModalHeader title="Resolved path" data-testid="path-modal-header" />
    <ModalBody>
      <Stack hasGutter>
        <StackItem>
          The resolved request path for this provider reference, with configuration values
          substituted into the template. This is the path appended to the provider URL when routing
          inference requests.
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
            <InputGroupItem>
              <ClipboardCopyButton
                id="path-copy"
                data-testid="path-modal-copy-button"
                variant="control"
                aria-label="Copy path"
                hasNoPadding
                onClick={() => {
                  navigator.clipboard.writeText(path);
                  setIsCopyTipCopied(true);
                }}
                onTooltipHidden={() => setIsCopyTipCopied(false)}
              >
                {isCopyTipCopied ? 'Copied' : 'Copy'}
              </ClipboardCopyButton>
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
