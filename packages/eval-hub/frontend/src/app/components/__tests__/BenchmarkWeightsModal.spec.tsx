import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import BenchmarkWeightsModal from '~/app/components/BenchmarkWeightsModal';
import type { WeightSegment } from '~/app/components/WeightDistributionBar';

const underMinimumSegments: WeightSegment[] = [
  { label: 'First benchmark', weight: 0.01, percentage: 1 },
  { label: 'Second benchmark', weight: 0.99, percentage: 99 },
];

describe('BenchmarkWeightsModal', () => {
  it('should normalize imported under-minimum weights before displaying or saving them', () => {
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

    expect(screen.getByTestId('weight-segment-0')).toHaveAttribute(
      'aria-label',
      'First benchmark: 5%',
    );
    expect(screen.getByTestId('weight-segment-1')).toHaveAttribute(
      'aria-label',
      'Second benchmark: 95%',
    );

    fireEvent.click(screen.getByTestId('benchmark-weights-save'));

    expect(onSave).toHaveBeenCalledWith([0.05, 0.95]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
