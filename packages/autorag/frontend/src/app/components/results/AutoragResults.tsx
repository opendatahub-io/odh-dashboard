/* eslint-disable camelcase */
import React from 'react';
import { Button } from '@patternfly/react-core';
import PatternDetailsModal from './PatternDetailsModal';

const mockData = {
  name: 'pattern0',
  iteration: 0,
  max_combinations: 3,
  duration_seconds: 0,
  settings: {
    vector_store: {
      datasource_type: 'ls_milvus',
      collection_name: 'collection0',
    },
    chunking: {
      method: 'recursive',
      chunk_size: 256,
      chunk_overlap: 128,
    },
    embedding: {
      model_id: 'mock-embed-a',
      distance_metric: 'cosine',
    },
    retrieval: {
      method: 'window',
      number_of_chunks: 5,
    },
    generation: {
      model_id: 'mock-llm-1',
      context_template_text: '{document}',
      user_message_text:
        '\n\nContext:\n{reference_documents}:\n\nQuestion: {question}. \nAgain, please answer the question based on the context provided only. If the context is not related to the question, just say you cannot answer. Respond exclusively in the language of the question, regardless of any other language used in the provided context. Ensure that your entire response is in the same language as the question.',
      system_message_text:
        'Please answer the question I provide in the Question section below, based solely on the information I provide in the Context section. If the question is unanswerable, please say you cannot answer.',
    },
  },
  scores: {
    answer_correctness: {
      mean: 0.5,
      ci_low: 0.4,
      ci_high: 0.7,
    },
    faithfulness: {
      mean: 0.2,
      ci_low: 0.1,
      ci_high: 0.5,
    },
    context_correctness: {
      mean: 1.0,
      ci_low: 0.9,
      ci_high: 1.0,
    },
  },
  final_score: 0.5,
};

function AutoragResults(): React.JSX.Element {
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <div>
      <Button variant="primary" onClick={() => setIsModalOpen(true)}>
        View pattern details
      </Button>
      <PatternDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={mockData}
      />
    </div>
  );
}

export default AutoragResults;
