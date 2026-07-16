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

type ProviderURLModalProps = {
  providerURL: string;
  isOpen: boolean;
  onClose: () => void;
  setIsCopyTipCopied: (isCopyTipCopied: boolean) => void;
  isCopyTipCopied: boolean;
  providerRef: string;
  targetModelId: string;
};

const ProviderURLModal: React.FC<ProviderURLModalProps> = ({
  providerURL,
  isOpen,
  onClose,
  setIsCopyTipCopied,
  isCopyTipCopied,
  providerRef,
  targetModelId,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    variant={ModalVariant.medium}
    data-testid="provider-url-modal"
  >
    <ModalHeader title="Provider URL" data-testid="provider-url-modal-header" />
    <ModalBody>
      <Stack hasGutter>
        <StackItem>
          This is the backend URL that the MaaS gateway routes traffic to for this provider.
          Consumers do not use this URL directly — they use the gateway endpoint shown in the table.
        </StackItem>
        <StackItem>
          <InputGroup>
            <InputGroupItem isFill>
              <TextInput
                value={providerURL}
                readOnly
                dir="ltr"
                isDisabled
                data-testid="provider-url-modal-input-value"
              />
            </InputGroupItem>
            <InputGroupItem>
              <ClipboardCopyButton
                id="provider-url-copy"
                data-testid="provider-modal-url-copy-button"
                variant="control"
                aria-label="Copy provider URL"
                hasNoPadding
                onClick={() => {
                  navigator.clipboard.writeText(providerURL);
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
          <Content data-testid="provider-modal-provider-ref-content">{providerRef}</Content>
        </StackItem>
        <StackItem>
          <strong>Target model ID</strong>
        </StackItem>
        <StackItem>
          <Content data-testid="provider-modal-target-model-id-content">{targetModelId}</Content>
        </StackItem>
      </Stack>
    </ModalBody>
    <ModalFooter>
      <Button variant="primary" onClick={onClose} data-testid="provider-modal-close-button">
        Close
      </Button>
    </ModalFooter>
  </Modal>
);

export default ProviderURLModal;
