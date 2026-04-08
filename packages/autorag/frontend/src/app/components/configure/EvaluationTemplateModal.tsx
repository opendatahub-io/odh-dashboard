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

const EVALUATION_TEMPLATE = `[
  {
    "question": "<text>",
    "correct_answer": "<text>",
    "correct_answer_document_ids": [
      "<file>",
      "<file>"
    ]
  },
  {
    "question": "<text>",
    "correct_answer": "<text>",
    "correct_answer_document_ids": [
      "<file>",
      "<file>"
    ]
  }
]`;

type EvaluationTemplateModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const EvaluationTemplateModal: React.FC<EvaluationTemplateModalProps> = ({ isOpen, onClose }) => {
  const handleDownload = () => {
    const blob = new Blob([EVALUATION_TEMPLATE], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'evaluation-template.json';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const modelHeaderLabelId = 'evaluation-template-modal-title';
  const modalBodyId = 'evaluation-template-modal-description';

  return (
    <Modal
      aria-labelledby={modelHeaderLabelId}
      aria-describedby={modalBodyId}
      variant="medium"
      isOpen={isOpen}
      onClose={onClose}
    >
      <ModalHeader
        title="Evaluation data template"
        labelId={modelHeaderLabelId}
        description="Use this JSON template to create an evaluation dataset. Each entry should include a question, the correct answer, and names of the documents that contain the answer."
      />
      <ModalBody id={modalBodyId}>
        <Flex
          direction={{ default: 'column' }}
          gap={{ default: 'gapMd' }}
          alignItems={{ default: 'alignItemsFlexEnd' }}
        >
          <Button
            data-testid="download-template-button"
            variant="secondary"
            size="sm"
            icon={<DownloadIcon />}
            onClick={handleDownload}
          >
            Download template
          </Button>
          <CodeBlock
            style={{ width: '100%' }}
            actions={
              <CodeBlockAction>
                <ClipboardCopyButton
                  id="evaluation-template-copy-button"
                  aria-label="Copy to clipboard"
                  variant="plain"
                  entryDelay={300}
                  exitDelay={300}
                  onClick={async () => {
                    navigator.clipboard.writeText(EVALUATION_TEMPLATE);
                  }}
                >
                  Copy to clipboard
                </ClipboardCopyButton>
              </CodeBlockAction>
            }
          >
            <CodeBlockCode id="evaluation-template-code-content">
              {EVALUATION_TEMPLATE}
            </CodeBlockCode>
          </CodeBlock>
        </Flex>
      </ModalBody>
      <ModalFooter>
        <Button
          data-testid="evaluation-template-close-modal-button"
          variant="primary"
          onClick={onClose}
        >
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default EvaluationTemplateModal;
