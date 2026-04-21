import React from 'react';
import CodeSnippetModal from '~/app/components/common/CodeSnippetModal';

const EVALUATION_TEMPLATE = `[
  {
    "question": "<question 1>",
    "correct_answers": [
      "<first answer for question 1>",
      "<second answer for question 1>",
      "..."
    ],
    "correct_answer_document_ids": [
      "<name of first document used to determine answers>",
      "<name of second document used to determine answers>",
      "..."
    ]
  },
  {
    "question": "<question 2>",
    "correct_answers": [
      "..."
    ],
    "correct_answer_document_ids": [
      "..."
    ]
  }
]`;

type EvaluationTemplateModalProps = {
  onClose: () => void;
};

function EvaluationTemplateModal(props: EvaluationTemplateModalProps): React.JSX.Element {
  return (
    <CodeSnippetModal
      id="evaluation-template"
      variant="small"
      title="Evaluation data template"
      description="Use this JSON template to create an evaluation dataset. Each entry should include a question, the correct answers, and names of the documents that were used to determine the answers."
      code={EVALUATION_TEMPLATE}
      downloadText="Download template"
      downloadFileName="evaluation-template.json"
      onClose={props.onClose}
    />
  );
}

export default EvaluationTemplateModal;
