/* eslint-disable camelcase */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { AutoragPatternScores } from '~/app/types/autoragPattern';
import ConfidenceIntervalChart from '~/app/components/run-results/PatternDetailsModal/components/ConfidenceIntervalChart';

const fullScores: AutoragPatternScores = {
  answer_correctness: { mean: 0.65, ci_low: 0.4, ci_high: 0.8 },
  faithfulness: { mean: 0.42, ci_low: 0.2, ci_high: 0.6 },
  context_correctness: { mean: 0.91, ci_low: 0.85, ci_high: 0.95 },
};

const comparisonScores: AutoragPatternScores = {
  answer_correctness: { mean: 0.55, ci_low: 0.3, ci_high: 0.7 },
  faithfulness: { mean: 0.38, ci_low: 0.15, ci_high: 0.5 },
  context_correctness: { mean: 0.82, ci_low: 0.75, ci_high: 0.88 },
};

describe('ConfidenceIntervalChart', () => {
  describe('single pattern mode', () => {
    it('should render all three marker types for each metric', () => {
      render(<ConfidenceIntervalChart scores={fullScores} />);

      expect(screen.getByTestId('ci-marker-low-answer_correctness')).toBeInTheDocument();
      expect(screen.getByTestId('ci-marker-mean-answer_correctness')).toBeInTheDocument();
      expect(screen.getByTestId('ci-marker-high-answer_correctness')).toBeInTheDocument();
    });

    it('should not render ci_low marker when value is null', () => {
      const scores: AutoragPatternScores = {
        answer_correctness: { mean: 0.65, ci_low: null, ci_high: 0.8 },
      };
      render(<ConfidenceIntervalChart scores={scores} />);

      expect(screen.queryByTestId('ci-marker-low-answer_correctness')).not.toBeInTheDocument();
      expect(screen.getByTestId('ci-marker-mean-answer_correctness')).toBeInTheDocument();
      expect(screen.getByTestId('ci-marker-high-answer_correctness')).toBeInTheDocument();
    });

    it('should not render ci_high marker when value is null', () => {
      const scores: AutoragPatternScores = {
        answer_correctness: { mean: 0.65, ci_low: 0.4, ci_high: null },
      };
      render(<ConfidenceIntervalChart scores={scores} />);

      expect(screen.getByTestId('ci-marker-low-answer_correctness')).toBeInTheDocument();
      expect(screen.getByTestId('ci-marker-mean-answer_correctness')).toBeInTheDocument();
      expect(screen.queryByTestId('ci-marker-high-answer_correctness')).not.toBeInTheDocument();
    });

    it('should return null for empty scores', () => {
      const { container } = render(<ConfidenceIntervalChart scores={{}} />);
      expect(container.firstChild).toBeNull();
    });

    it('should hide metrics with zero mean and no CI values', () => {
      const scores: AutoragPatternScores = {
        answer_correctness: { mean: 0.65, ci_low: 0.4, ci_high: 0.8 },
        context_correctness: { mean: 0, ci_low: null, ci_high: null },
      };
      render(<ConfidenceIntervalChart scores={scores} />);

      expect(screen.getByTestId('ci-track-answer_correctness')).toBeInTheDocument();
      expect(screen.queryByTestId('ci-track-context_correctness')).not.toBeInTheDocument();
    });

    it('should render single-mode description text', () => {
      render(<ConfidenceIntervalChart scores={fullScores} />);

      expect(
        screen.getByText(/Each optimization metric is plotted on a shared 0–1 x-axis/),
      ).toBeInTheDocument();
    });
  });

  describe('comparison mode', () => {
    it('should render primary and comparison columns', () => {
      render(
        <ConfidenceIntervalChart
          scores={fullScores}
          comparisonScores={comparisonScores}
          primaryLabel="Pattern 1"
          comparisonLabel="Pattern 2"
        />,
      );

      expect(screen.getByTestId('ci-column-primary')).toBeInTheDocument();
      expect(screen.getByTestId('ci-column-comparison')).toBeInTheDocument();
    });

    it('should render column header labels', () => {
      render(
        <ConfidenceIntervalChart
          scores={fullScores}
          comparisonScores={comparisonScores}
          primaryLabel="Pattern 1"
          comparisonLabel="Pattern 2"
        />,
      );

      expect(screen.getByText('Pattern 1')).toBeInTheDocument();
      expect(screen.getByText('Pattern 2')).toBeInTheDocument();
    });

    it('should render comparison-mode description text', () => {
      render(
        <ConfidenceIntervalChart
          scores={fullScores}
          comparisonScores={comparisonScores}
          primaryLabel="Pattern 1"
          comparisonLabel="Pattern 2"
        />,
      );

      expect(
        screen.getByText(/Each pattern plots mean, CI low, and CI high on its own 0–1 x-axis/),
      ).toBeInTheDocument();
    });

    it('should render shared metric labels on the left', () => {
      render(
        <ConfidenceIntervalChart
          scores={fullScores}
          comparisonScores={comparisonScores}
          primaryLabel="Pattern 1"
          comparisonLabel="Pattern 2"
        />,
      );

      expect(screen.getByText('Answer correctness')).toBeInTheDocument();
      expect(screen.getByText('Answer faithfulness')).toBeInTheDocument();
      expect(screen.getByText('Context correctness')).toBeInTheDocument();
    });

    it('should render markers for both patterns', () => {
      render(
        <ConfidenceIntervalChart
          scores={fullScores}
          comparisonScores={comparisonScores}
          primaryLabel="Pattern 1"
          comparisonLabel="Pattern 2"
        />,
      );

      const primary = screen.getByTestId('ci-marker-mean-answer_correctness-primary');
      const comparison = screen.getByTestId('ci-marker-mean-answer_correctness-comparison');
      expect(primary).toBeInTheDocument();
      expect(comparison).toBeInTheDocument();
    });
  });
});
