import React from 'react';
import CodeSnippetModal from '~/app/components/common/CodeSnippetModal';

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

const EvaluationTemplateModal: React.FC<EvaluationTemplateModalProps> = ({ isOpen, onClose }) => (
  <CodeSnippetModal
    id="evaluation-template"
    title="Evaluation data template"
    description="Use this JSON template to create an evaluation dataset. Each entry should include a question, the correct answer, and names of the documents that contain the answer."
    code={EVALUATION_TEMPLATE}
    downloadText="Download template"
    downloadFileName="evaluation-template.json"
    isOpen={isOpen}
    onClose={onClose}
  />
);

export default EvaluationTemplateModal;
