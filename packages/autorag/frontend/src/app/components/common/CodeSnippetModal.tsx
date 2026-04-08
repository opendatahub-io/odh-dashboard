import {
  Button,
  ClipboardCopyButton,
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
  Flex,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';
import React from 'react';

type CodeSnippetModalProps = {
  id: string;
  variant?: 'small' | 'default' | 'medium' | 'large';
  title: string;
  description?: string;
  code: string;
  downloadText?: string;
  downloadFileName: string;
  isOpen: boolean;
  onClose: () => void;
};

const CodeSnippetModal: React.FC<CodeSnippetModalProps> = ({
  id,
  variant,
  title,
  description,
  code,
  downloadText = 'Download',
  downloadFileName,
  isOpen,
  onClose,
}) => {
  const handleDownload = () => {
    const blob = new Blob([code], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadFileName;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const modalHeaderLabelId = `${id}-modal-title`;
  const modalBodyId = `${id}-modal-description`;

  return (
    <Modal
      aria-labelledby={modalHeaderLabelId}
      aria-describedby={modalBodyId}
      variant={variant}
      isOpen={isOpen}
      onClose={onClose}
    >
      <ModalHeader title={title} labelId={modalHeaderLabelId} description={description} />
      <ModalBody id={modalBodyId}>
        <Flex
          direction={{ default: 'column' }}
          gap={{ default: 'gapMd' }}
          alignItems={{ default: 'alignItemsFlexEnd' }}
        >
          <Button
            data-testid={`${id}-download-button`}
            variant="secondary"
            size="sm"
            icon={<DownloadIcon />}
            onClick={handleDownload}
          >
            {downloadText}
          </Button>
          <CodeBlock
            style={{ width: '100%' }}
            actions={
              <CodeBlockAction>
                <ClipboardCopyButton
                  id={`${id}-copy-button`}
                  aria-label="Copy to clipboard"
                  variant="plain"
                  onClick={async () => {
                    navigator.clipboard.writeText(code);
                  }}
                >
                  Copy to clipboard
                </ClipboardCopyButton>
              </CodeBlockAction>
            }
          >
            <CodeBlockCode id={`${id}-code-content`}>{code}</CodeBlockCode>
          </CodeBlock>
        </Flex>
      </ModalBody>
      <ModalFooter>
        <Button data-testid={`${id}-close-button`} variant="primary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CodeSnippetModal;
