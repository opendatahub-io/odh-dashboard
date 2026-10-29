import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { mockFlatBenchmark } from '~/__mocks__/mockBenchmark';
import BenchmarkCard from '~/app/components/BenchmarkCard';
import { FlatBenchmark } from '~/app/types';

const mockOnSelect = jest.fn();
const mockOnRunBenchmark = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

const renderCard = (benchmarkOverrides: Partial<FlatBenchmark> = {}) => {
  const benchmark: FlatBenchmark = {
    ...mockFlatBenchmark(),
    ...benchmarkOverrides,
  };

  return {
    benchmark,
    ...render(
      <BenchmarkCard
        benchmark={benchmark}
        isSelected={false}
        onSelect={mockOnSelect}
        onRunBenchmark={mockOnRunBenchmark}
      />,
    ),
  };
};

describe('BenchmarkCard', () => {
  it('should render the benchmark name and subtitle', () => {
    renderCard();
    expect(screen.getByText('TruthfulQA MC1')).toBeInTheDocument();
    expect(screen.getByText('truthfulqa_mc1 · LM Evaluation Harness')).toBeInTheDocument();
  });

  it('should mark the card content clickable', () => {
    renderCard({ id: 'clickable-bench' });
    expect(screen.getByTestId('benchmark-card-lm_evaluation_harness-clickable-bench')).toHaveClass(
      'm-clickable',
    );
  });

  it('should invoke the selection callback when the title region is clicked', () => {
    renderCard({ id: 'title-bench' });
    fireEvent.click(
      screen.getByTestId('benchmark-card-title-region-lm_evaluation_harness-title-bench'),
    );
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });

  it('should invoke the selection callback when the card body is clicked', () => {
    renderCard({ id: 'body-bench' });
    fireEvent.click(
      screen.getByTestId('benchmark-card-body-region-lm_evaluation_harness-body-bench'),
    );
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });

  it('should not double-fire the selection callback when the name link is clicked', () => {
    renderCard({ id: 'name-bench' });
    fireEvent.click(screen.getByText('TruthfulQA MC1'));
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });

  it('should keep the footer action isolated from the drawer click region', () => {
    renderCard({ id: 'footer-bench' });
    fireEvent.click(screen.getByTestId('select-benchmark-button'));
    expect(mockOnRunBenchmark).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).not.toHaveBeenCalled();
  });
});
