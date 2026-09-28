/* eslint-disable camelcase */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type {
  AutoRAGEvaluationResult,
  AutoragPattern,
  PatternDataBundle,
} from '~/app/types/autoragPattern';
import SampleQATab, {
  getComparisonResult,
} from '~/app/components/run-results/PatternDetailsModal/tabs/SampleQATab';

const result = (question_id?: string, document_key = 'document-key'): AutoRAGEvaluationResult => ({
  question: question_id ?? 'question',
  question_id,
  answer: 'answer',
  correct_answers: ['correct answer'],
  answer_contexts: [{ text: 'context', document_key }],
  metrics: [],
});

const pattern = (name: string): AutoragPattern => ({ name }) as AutoragPattern;

const bundle = (name: string, evaluationResults: AutoRAGEvaluationResult[]): PatternDataBundle => ({
  pattern: pattern(name),
  evaluationResults,
  isEvaluationLoading: false,
  isEvaluationError: false,
});

describe('getComparisonResult', () => {
  it('should use the row index when the primary row has no question id', () => {
    const comparison = result('comparison-id', 'comparison-document');

    expect(getComparisonResult(result(undefined), new Map(), [comparison], 0)).toBe(comparison);
  });

  it('should use the row index when the comparison row has no question id', () => {
    const primary = result('q1', 'primary-document');
    const comparison = result(undefined, 'comparison-document');

    expect(getComparisonResult(primary, new Map(), [comparison], 0)).toBe(comparison);
  });

  it('should match comparison rows by matching question ids', () => {
    const primary = result('q1', 'primary-document');
    const comparison = result('q1', 'different-document');

    expect(getComparisonResult(primary, new Map([['q1', comparison]]), [comparison], 0)).toBe(
      comparison,
    );
  });

  it('should not match comparison rows with mismatched question ids', () => {
    const primary = result('q1', 'primary-document');
    const comparison = result('q2', 'comparison-document');

    expect(
      getComparisonResult(primary, new Map([['q2', comparison]]), [comparison], 0),
    ).toBeUndefined();
  });
});

describe('SampleQATab comparison rendering', () => {
  it('should keep primary metric scores when comparison rows do not match', () => {
    const primary = {
      ...result('q1'),
      metrics: [{ name: 'faithfulness', evaluator: 'unitxt', score: 0.8 }],
    };
    const comparison = {
      ...result('q2'),
      metrics: [{ name: 'faithfulness', evaluator: 'unitxt', score: 0.4 }],
    };

    render(
      <SampleQATab
        primaryPattern={bundle('pattern0', [primary])}
        comparisonPattern={bundle('pattern1', [comparison])}
      />,
    );

    expect(screen.getByTestId('qa-primary-metric-scores-q1')).toHaveTextContent('0.8');
    expect(screen.queryByTestId('qa-comparison-metric-scores-q1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('comparison-radar-chart')).not.toBeInTheDocument();
  });

  it('should keep primary metric scores when comparison results are absent', () => {
    const primary = {
      ...result('q1'),
      metrics: [{ name: 'faithfulness', evaluator: 'unitxt', score: 0.8 }],
    };

    render(
      <SampleQATab
        primaryPattern={bundle('pattern0', [primary])}
        comparisonPattern={bundle('pattern1', [])}
      />,
    );

    expect(screen.getByTestId('qa-primary-metric-scores-q1')).toHaveTextContent('0.8');
    expect(screen.queryByTestId('comparison-radar-chart')).not.toBeInTheDocument();
  });
});
