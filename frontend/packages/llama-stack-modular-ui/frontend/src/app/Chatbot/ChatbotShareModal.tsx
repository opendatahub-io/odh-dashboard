import React from 'react';
import {
  Button,
  ClipboardCopy,
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import { ExternalLinkSquareAltIcon } from '@patternfly/react-icons';

type ChatbotShareModalProps = {
  onToggle: () => void;
};

const ChatbotShareModal: React.FC<ChatbotShareModalProps> = ({ onToggle }) => {
  const shareUrl = window.location.href;

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen
      onClose={onToggle}
      aria-labelledby="share-modal-title"
      data-testid="share-modal"
    >
      <ModalHeader title="Share Chatbot" />
      <ModalBody>
        <p>Share this chatbot with teammates outside of Openshift AI</p>
        <br />
        <p
          style={{
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
            marginBottom: 'var(--pf-t--global--spacer--sm)',
            padding: 'var(--pf-t--global--spacer--sm)',
          }}
        >
          {shareUrl}
        </ClipboardCopy>
        <br />
        <Button
          component="a"
          variant="link"
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          icon={<ExternalLinkSquareAltIcon />}
          iconPosition="end"
        >
          Launch in new tab
        </Button>
      </ModalBody>
    </Modal>
  );
};

export { ChatbotShareModal };
