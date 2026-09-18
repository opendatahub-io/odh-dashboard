/* eslint-disable camelcase */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { AutoRAGEvaluationResult } from '~/app/types/autoragPattern';
import SampleQAEntry, {
  MetricScores,
  RetrievedContextSection,
} from '~/app/components/run-results/PatternDetailsModal/components/SampleQAEntry';

const result = (contexts: AutoRAGEvaluationResult['answer_contexts']): AutoRAGEvaluationResult => ({
  question: 'What is RAG?',
  question_id: 'q0',
  answer: 'A retrieval-augmented generation system.',
  correct_answers: ['A system that retrieves context.'],
  answer_contexts: contexts,
  metrics: [{ name: 'faithfulness', evaluator: 'unitxt', score: null }],
});

describe('SampleQAEntry', () => {
  it('should render canonical and normalized legacy contexts with their full document keys', () => {
    render(
      <SampleQAEntry
        result={result([
          { text: 'Canonical context', document_key: 's3://bucket/path/canonical.jsonl' },
          { text: 'Legacy context', document_key: '/mnt/data/legacy/document.txt' },
        ])}
        questionNumber={1}
        allMetricNames={[{ name: 'faithfulness', evaluator: 'unitxt' }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retrieved context (2)' }));
    expect(screen.getByText('Canonical context')).toBeInTheDocument();
    expect(screen.getByText('s3://bucket/path/canonical.jsonl')).toBeInTheDocument();
    expect(screen.getByText('/mnt/data/legacy/document.txt')).toBeInTheDocument();
  });

  it('should include the pattern label in comparison context toggle names', () => {
    render(
      <>
        <RetrievedContextSection
          result={result([{ text: 'Primary', document_key: 'primary' }])}
          label="pattern 0"
        />
        <RetrievedContextSection
          result={result([{ text: 'Comparison', document_key: 'comparison' }])}
          label="pattern 1"
        />
      </>,
    );

    expect(
      screen.getByRole('button', { name: 'Retrieved context (pattern 0) (1)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Retrieved context (pattern 1) (1)' }),
    ).toBeInTheDocument();
  });

  it('should not render a context section when contexts are absent', () => {
    render(
      <SampleQAEntry
        result={result([])}
        questionNumber={1}
        allMetricNames={[{ name: 'faithfulness', evaluator: 'unitxt' }]}
      />,
    );

    expect(screen.queryByText(/Retrieved context/)).not.toBeInTheDocument();
  });

  it('should display unavailable metric scores as N/A', () => {
    render(
      <SampleQAEntry
        result={result([])}
        questionNumber={1}
        allMetricNames={[{ name: 'faithfulness', evaluator: 'unitxt' }]}
      />,
    );

    expect(screen.getByTestId('qa-metric-scores-q0')).toHaveTextContent('N/A');
    expect(screen.getByTestId('qa-metric-scores-q0')).not.toHaveTextContent(': 0');
  });

  it('should include the evaluator in metric score labels', () => {
    render(
      <SampleQAEntry
        result={{
          ...result([]),
          metrics: [{ name: 'faithfulness', evaluator: 'ragas', score: 0.77 }],
        }}
        questionNumber={1}
        allMetricNames={[{ name: 'faithfulness', evaluator: 'ragas' }]}
      />,
    );

    expect(screen.getByTestId('qa-metric-scores-q0')).toHaveTextContent(
      'Answer faithfulness (ragas): 0.770',
    );
  });

  it('should show N/A for duplicate normalized metric identities', () => {
    render(
      <MetricScores
        metrics={[
          { name: 'faithfulness', evaluator: 'unitxt', score: 0.77 },
          { name: ' Faithfulness ', evaluator: ' UNITXT ', score: 0.88 },
        ]}
        testId="duplicate-metric-scores"
      />,
    );

    expect(screen.getByTestId('duplicate-metric-scores')).toHaveTextContent(
      'Answer faithfulness (unitxt): N/A',
    );
    expect(screen.getByTestId('duplicate-metric-scores').querySelectorAll('strong')).toHaveLength(
      1,
    );
  });
});
