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
import type { UIError, UIErrorMapping } from './types.ts';
import { UIErrorDefaults } from './constants.ts';

// Types ---------------------------------------------------------------------->

// Globals -------------------------------------------------------------------->

// Private -------------------------------------------------------------------->

// eslint-disable-next-line @typescript-eslint/no-empty-function
const emptyFunction = () => {};

// Components ----------------------------------------------------------------->

interface UIErrorModalProps {
  id?: string;
  isOpen: boolean;
  uiError?: UIError;
  uiErrorMapping?: UIErrorMapping;

  /** Callback fired when the modal is closed via dismiss or cancel. */
  onClose?: (_event?: KeyboardEvent | React.MouseEvent) => void;
}
const UIErrorModal: React.FC<UIErrorModalProps> = ({
  id,
  isOpen,
  uiError,
  onClose: _onClose,
  uiErrorMapping,
}) => {
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
      id={rootId}
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
        title={uiErrorMapping?.title || UIErrorDefaults.uiErrorMapping.title}
        description={
          uiErrorMapping?.description ||
          uiError?.reason ||
          UIErrorDefaults.uiErrorMapping.description
        }
        labelId={`${rootId}-UIErrorModal-modal-title`}
      />
      <ModalBody id={`${rootId}-UIErrorModal-modal-body`}>
        <Flex direction={{ default: 'column' }}>
          <FlexItem>
            <Content component={ContentVariants.dl}>
              <Content component={ContentVariants.dt}>
                {UIErrorDefaults.labels.subtitleTransaction}
              </Content>
              <Content component={ContentVariants.dd} className="pf-v6-u-font-family-monospace">
                {uiError?.transactionId}
              </Content>
              <Content component={ContentVariants.dt}>{UIErrorDefaults.labels.subtitleID}</Content>
              <Content component={ContentVariants.dd} className="pf-v6-u-font-family-monospace">
                {uiError?.messageId}
              </Content>
              {hasDetails && (
                <Content component={ContentVariants.dt}>
                  {UIErrorDefaults.labels.subtitleDetails}
                </Content>
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
                      {UIErrorDefaults.labels.copyCTA}
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
          data-testid="UIErrorModal-cancel"
          variant="link"
          onClick={(e) => {
            onClose(e);
            resetState();
          }}
        >
          {UIErrorDefaults.labels.modalSecondaryCTA}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

// Public --------------------------------------------------------------------->

export default UIErrorModal;
