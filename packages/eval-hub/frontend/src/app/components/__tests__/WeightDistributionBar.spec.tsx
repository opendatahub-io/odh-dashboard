import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import WeightDistributionBar, { WeightSegment } from '~/app/components/WeightDistributionBar';

const segments: WeightSegment[] = [
  { label: 'First', weight: 0.1, percentage: 0 },
  { label: 'Second', weight: 0.1, percentage: 0 },
  { label: 'Third', weight: 99.8, percentage: 100 },
];

describe('WeightDistributionBar', () => {
  it('should display relative weight values when requested', () => {
    const weightedSegments: WeightSegment[] = [
      { label: 'First', weight: 1, percentage: 50 },
      { label: 'Second', weight: 1, percentage: 50 },
    ];

    render(
      <WeightDistributionBar
        segments={weightedSegments}
        showPercentages={false}
        showWeightValues
      />,
    );

    expect(screen.getAllByText('1')).toHaveLength(2);
    expect(screen.getByText('First: 1')).toBeInTheDocument();
    expect(screen.getByText('Second: 1')).toBeInTheDocument();
    expect(screen.getByTestId('weight-segment-0')).toHaveAttribute('aria-label', 'First: 1');
    expect(screen.getByTestId('weight-segment-1')).toHaveAttribute('aria-label', 'Second: 1');
  });

  it('should set divider accessibility bounds from the adjacent segments', () => {
    const weightedSegments: WeightSegment[] = [
      { label: 'First', weight: 20, percentage: 0 },
      { label: 'Second', weight: 30, percentage: 0 },
      { label: 'Third', weight: 50, percentage: 0 },
    ];

    render(<WeightDistributionBar segments={weightedSegments} onWeightsChange={jest.fn()} />);

    expect(screen.getByTestId('weight-divider-0')).toHaveAttribute(
      'aria-orientation',
      'horizontal',
    );
    expect(screen.getByTestId('weight-divider-0')).toHaveAttribute('aria-valuemin', '1');
    expect(screen.getByTestId('weight-divider-0')).toHaveAttribute('aria-valuemax', '49');
    expect(screen.getByTestId('weight-divider-1')).toHaveAttribute('aria-valuemin', '21');
    expect(screen.getByTestId('weight-divider-1')).toHaveAttribute('aria-valuemax', '99');
  });

  it('should keep keyboard adjustments non-negative when pair total is below twice the minimum', () => {
    const onWeightsChange = jest.fn();
    render(<WeightDistributionBar segments={segments} onWeightsChange={onWeightsChange} />);

    fireEvent.keyDown(screen.getByTestId('weight-divider-0'), { key: 'ArrowRight' });

    expect(onWeightsChange).toHaveBeenCalledWith([0, 0, 1]);
  });

  it('should keep drag adjustments non-negative when pair total is below twice the minimum', () => {
    const onWeightsChange = jest.fn();
    render(<WeightDistributionBar segments={segments} onWeightsChange={onWeightsChange} />);

    jest
      .spyOn(screen.getByTestId('weight-distribution-bar'), 'getBoundingClientRect')
      .mockReturnValue({
        width: 100,
        left: 0,
      } as DOMRect);

    fireEvent.mouseDown(screen.getByTestId('weight-divider-0'));
    fireEvent.mouseMove(window, { clientX: 50 });

    expect(onWeightsChange).toHaveBeenCalledWith([0, 0, 1]);
  });
});
