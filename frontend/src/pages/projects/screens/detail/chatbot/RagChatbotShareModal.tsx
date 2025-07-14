import React from 'react';
import {
  Modal,
  ModalVariant,
  ModalBody,
  ModalHeader,
  ClipboardCopy,
  Button,
} from '@patternfly/react-core';
import { ExternalLinkSquareAltIcon } from '@patternfly/react-icons';

interface RagChatbotShareModalProps {
  onToggle: () => void;
}

const RagChatbotShareModal: React.FC<RagChatbotShareModalProps> = ({ onToggle }) => (
  <Modal variant={ModalVariant.small} isOpen onClose={onToggle} aria-labelledby="share-modal-title">
    <ModalHeader
      title="Share Chatbot"
      description="Share this chatbot with teammates outside of Openshift AI"
    />
    <ModalBody>
      <p
        style={{
          fontSize: 'var(--pf-t--global--font--size--body--sm)',
          fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
          paddingBottom: 'var(--pf-t--global--spacer--sm)',
        }}
      >
        Chatbot URL
      </p>
      <ClipboardCopy
        truncation
        hoverTip="Copy link to share chatbot"
        clickTip="Copied"
        variant="inline-compact"
        style={{
          borderRadius: 'var(--pf-t--global--spacer--xs)',
          fontSize: 'var(--pf-t--global--font--size--body--sm)',
          marginBottom: 'var(--pf-t--global--spacer--sm)',
          padding: 'var(--pf-t--global--spacer--sm)',
        }}
      >
        https://mychatbotlink.com
      </ClipboardCopy>
      <br />
      <Button
        variant="link"
        icon={<ExternalLinkSquareAltIcon />}
        iconPosition="end"
        style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)' }}
      >
        Launch in new tab
      </Button>
    </ModalBody>
  </Modal>
);

export default RagChatbotShareModal;
