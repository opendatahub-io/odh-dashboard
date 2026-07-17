// Modules -------------------------------------------------------------------->

import React, { useId } from 'react';
import {
  Button,
  ClipboardCopyButton,
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@patternfly/react-core';
import type { UIError } from './types.ts';

// Types ---------------------------------------------------------------------->

// Globals -------------------------------------------------------------------->

const defaults = {
  labels: {
    modalTitle: 'Something went wrong',
    modalDescription: 'An unexpected error occurred. Please try again later.',
    modalPrimaryCTA: 'Retry', // Should we have a retry?
    modalSecondaryCTA: 'Close',
    copyCTA: 'Copy',

    subtitleTransaction: 'Transaction',
    subtitleID: 'ID',
    subtitleDetails: 'Details',
  },
};

// Private -------------------------------------------------------------------->

// eslint-disable-next-line @typescript-eslint/no-empty-function
const emptyFunction = () => {};

// Components ----------------------------------------------------------------->

interface UIErrorModalProps {
  id?: string;
  isOpen: boolean;
  uiError?: UIError;

  /** Callback fired when the modal is closed via dismiss or cancel. */
  onClose?: (_event?: KeyboardEvent | React.MouseEvent) => void;
}
const UIErrorModal: React.FC<UIErrorModalProps> = ({ id, isOpen, uiError, onClose: _onClose }) => {
  const generatedId = useId();
  const rootId = id ?? generatedId;

  const resetState = emptyFunction;
  const onClose = _onClose ?? emptyFunction;
  const handleCopy = React.useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(emptyFunction, () => {
      // clipboard access denied
    });
  }, []);

  const hasDetails = Boolean(uiError?.details);
  let serializedDetails = '';
  if (uiError && hasDetails) {
    serializedDetails = JSON.stringify(uiError.details, null, '    ');
  }

  return (
    <Modal
      elementToFocus={`#${CSS.escape(`${rootId}-UIErrorModal-search-input`)}`}
      id={id}
      isOpen={isOpen}
      onClose={(e) => {
        onClose(e);
        resetState();
      }}
      variant="large"
      aria-labelledby={`${rootId}-UIErrorModal-modal-title`}
      aria-describedby={`${rootId}-UIErrorModal-modal-body`}
    >
      <ModalHeader
        title={defaults.labels.modalTitle}
        description={defaults.labels.modalDescription}
        labelId={`${rootId}-UIErrorModal-modal-title`}
      />
      <ModalBody id={`${rootId}-UIErrorModal-modal-body`}>
        <Flex direction={{ default: 'column' }}>
          <FlexItem>
            <Content component={ContentVariants.dl}>
              <Content component={ContentVariants.dt}>
                {defaults.labels.subtitleTransaction}
              </Content>
              <Content component={ContentVariants.dd} className="pf-v6-u-font-family-monospace">
                {uiError?.transactionId}
              </Content>
              <Content component={ContentVariants.dt}>{defaults.labels.subtitleID}</Content>
              <Content component={ContentVariants.dd} className="pf-v6-u-font-family-monospace">
                {uiError?.messageId}
              </Content>
              {hasDetails && (
                <Content component={ContentVariants.dt}>{defaults.labels.subtitleDetails}</Content>
              )}
            </Content>
          </FlexItem>
          {hasDetails && (
            <FlexItem>
              <CodeBlock
                className="pf-v6-u-mt-md"
                actions={
                  <CodeBlockAction>
                    <ClipboardCopyButton
                      id={`${rootId}-UIErrorModal-copy-button`}
                      onClick={() => handleCopy(serializedDetails)}
                      variant="plain"
                    >
                      {defaults.labels.copyCTA}
                    </ClipboardCopyButton>
                  </CodeBlockAction>
                }
              >
                <CodeBlockCode>{serializedDetails}</CodeBlockCode>
              </CodeBlock>
            </FlexItem>
          )}
        </Flex>
      </ModalBody>
      <ModalFooter>
        <Button
          key="cancel"
          data-testid="file-explorer-cancel-btn"
          variant="link"
          onClick={(e) => {
            onClose(e);
            resetState();
          }}
        >
          {defaults.labels.modalSecondaryCTA}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

// Public --------------------------------------------------------------------->

export default UIErrorModal;
