import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import BenchmarkWeightsModal from '~/app/components/BenchmarkWeightsModal';
import type { WeightSegment } from '~/app/components/WeightDistributionBar';

const underMinimumSegments: WeightSegment[] = [
  { label: 'First benchmark', weight: 0.01, percentage: 1 },
  { label: 'Second benchmark', weight: 0.99, percentage: 99 },
];

describe('BenchmarkWeightsModal', () => {
  it('should show relative ratios and normalize imported under-minimum weights before saving', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();

    render(
      <BenchmarkWeightsModal
        segments={underMinimumSegments}
        minWeightPercent={5}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    expect(screen.getByTestId('benchmark-weight-input-0')).toHaveValue(1);
    expect(screen.getByTestId('benchmark-weight-input-1')).toHaveValue(19);
    expect(screen.getByTitle('First benchmark')).toHaveClass(
      'evalhub-benchmark-weights-modal__input-label',
    );
    expect(
      screen.getByText(
        'Enter a positive integer ratio for each benchmark. A ratio of 2 gives twice the weight of a ratio of 1; ratios of 1 and 1 give equal weight.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('weight-segment-0')).toHaveAttribute('aria-label', 'First benchmark');
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('benchmark-weights-save'));

    expect(onSave).toHaveBeenCalledWith([0.05, 0.95]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should save normalized weights from edited ratios', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const segments: WeightSegment[] = [
      { label: 'First benchmark', weight: 0.5, percentage: 50 },
      { label: 'Second benchmark', weight: 0.5, percentage: 50 },
    ];

    render(
      <BenchmarkWeightsModal
        segments={segments}
        minWeightPercent={5}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    fireEvent.change(screen.getByTestId('benchmark-weight-input-0'), {
      target: { value: '3' },
    });
    fireEvent.click(screen.getByTestId('benchmark-weights-save'));

    expect(onSave).toHaveBeenCalledWith([0.75, 0.25]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should require every ratio to be positive before saving', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const segments: WeightSegment[] = [
      { label: 'First benchmark', weight: 0.5, percentage: 50 },
      { label: 'Second benchmark', weight: 0.5, percentage: 50 },
    ];

    render(
      <BenchmarkWeightsModal
        segments={segments}
        minWeightPercent={5}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    fireEvent.change(screen.getByTestId('benchmark-weight-input-0'), {
      target: { value: '0' },
    });

    expect(screen.getByTestId('benchmark-weights-save')).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should reject decimal ratio values', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const segments: WeightSegment[] = [
      { label: 'First benchmark', weight: 0.5, percentage: 50 },
      { label: 'Second benchmark', weight: 0.5, percentage: 50 },
    ];

    render(
      <BenchmarkWeightsModal
        segments={segments}
        minWeightPercent={5}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    const input = screen.getByTestId('benchmark-weight-input-0');
    fireEvent.change(input, { target: { value: '1.5' } });

    expect(input).toHaveValue(1);
    expect(screen.getByTestId('benchmark-weights-save')).toBeEnabled();
  });
});
