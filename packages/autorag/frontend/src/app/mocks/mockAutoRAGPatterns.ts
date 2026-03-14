/* eslint-disable camelcase */
import type { AutoRAGPattern } from '~/app/types/autoragPattern';

export const mockAutoRAGPatterns: AutoRAGPattern[] = [
  {
    name: 'pattern0',
    iteration: 0,
    max_combinations: 3,
    duration_seconds: 0,
    settings: {
      vector_store: { datasource_type: 'ls_milvus', collection_name: 'collection0' },
      chunking: { method: 'recursive', chunk_size: 256, chunk_overlap: 128 },
      embedding: { model_id: 'mock-embed-a', distance_metric: 'cosine' },
      retrieval: { method: 'window', number_of_chunks: 5 },
      generation: {
        model_id: 'mock-llm-1',
        context_template_text: '{document}',
        user_message_text: '',
        system_message_text: '',
      },
    },
    scores: {
      answer_correctness: { mean: 0.5, ci_low: 0.4, ci_high: 0.7 },
      faithfulness: { mean: 0.2, ci_low: 0.1, ci_high: 0.5 },
      context_correctness: { mean: 1.0, ci_low: 0.9, ci_high: 1.0 },
    },
    final_score: 0.5,
  },
  {
    name: 'pattern1',
    iteration: 1,
    max_combinations: 3,
    duration_seconds: 0.5,
    settings: {
      vector_store: { datasource_type: 'ls_milvus', collection_name: 'collection1' },
      chunking: { method: 'recursive', chunk_size: 256, chunk_overlap: 128 },
      embedding: { model_id: 'mock-embed-b', distance_metric: 'cosine' },
      retrieval: { method: 'window', number_of_chunks: 5 },
      generation: {
        model_id: 'mock-llm-1',
        context_template_text: '{document}',
        user_message_text: '',
        system_message_text: '',
      },
    },
    scores: {
      answer_correctness: { mean: 0.6, ci_low: 0.4, ci_high: 0.7 },
      faithfulness: { mean: 0.3, ci_low: 0.1, ci_high: 0.5 },
      context_correctness: { mean: 1.0, ci_low: 0.9, ci_high: 1.0 },
    },
    final_score: 0.6,
  },
  {
    name: 'pattern2',
    iteration: 2,
    max_combinations: 3,
    duration_seconds: 1.0,
    settings: {
      vector_store: { datasource_type: 'ls_milvus', collection_name: 'collection2' },
      chunking: { method: 'recursive', chunk_size: 256, chunk_overlap: 128 },
      embedding: { model_id: 'mock-embed-a', distance_metric: 'cosine' },
      retrieval: { method: 'window', number_of_chunks: 5 },
      generation: {
        model_id: 'mock-llm-2',
        context_template_text: '{document}',
        user_message_text: '',
        system_message_text: '',
      },
    },
    scores: {
      answer_correctness: { mean: 0.7, ci_low: 0.4, ci_high: 0.7 },
      faithfulness: { mean: 0.4, ci_low: 0.1, ci_high: 0.5 },
      context_correctness: { mean: 1.0, ci_low: 0.9, ci_high: 1.0 },
    },
    final_score: 0.7,
  },
];
