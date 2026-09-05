import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import BenchmarkConfigAccordion from '~/app/components/BenchmarkConfigAccordion';
import type { CopySuiteBenchmark } from '~/app/pages/useCopySuiteForm';

const benchmarks: CopySuiteBenchmark[] = [
  {
    id: 'arc_easy',
    providerId: 'provider-one',
    name: 'ARC Easy',
    weight: 0.5,
    primaryMetric: 'accuracy',
    numSamples: 100,
    numFewShot: 2,
    threshold: 70,
    availableMetrics: ['accuracy', 'f1'],
  },
  {
    id: 'truthfulqa',
    providerId: 'provider-one',
    name: 'TruthfulQA',
    weight: 0.5,
    primaryMetric: 'accuracy',
    numSamples: 200,
    numFewShot: 3,
    threshold: 75,
    availableMetrics: ['accuracy'],
  },
];

const renderAccordion = (
  overrides: Partial<React.ComponentProps<typeof BenchmarkConfigAccordion>> = {},
) =>
  render(
    <BenchmarkConfigAccordion
      benchmarks={benchmarks}
      onUpdate={jest.fn()}
      onRemove={jest.fn()}
      canRemove
      {...overrides}
    />,
  );

describe('BenchmarkConfigAccordion', () => {
  it('should render each benchmark expanded with its configuration fields', () => {
    renderAccordion();

    expect(screen.getByText('ARC Easy')).toBeInTheDocument();
    expect(screen.getByText('provider-one-arc_easy')).toBeInTheDocument();
    expect(screen.getByText('TruthfulQA')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-samples-input-0')).toHaveValue(100);
    expect(screen.getByTestId('benchmark-few-shot-input-1')).toHaveValue(3);
    expect(screen.getAllByRole('spinbutton', { name: 'Threshold' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(2);
  });

  it('should collapse and expand an individual benchmark', () => {
    renderAccordion();

    const toggle = screen.getByTestId('benchmark-expand-toggle-0');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('benchmark-samples-input-0')).not.toBeInTheDocument();
    expect(screen.getByText('ARC Easy')).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByTestId('benchmark-samples-input-0')).toBeInTheDocument();
  });

  it('should update the selected metric', () => {
    const onUpdate = jest.fn();
    renderAccordion({ onUpdate });

    fireEvent.click(screen.getByTestId('benchmark-metric-toggle-0'));
    fireEvent.click(screen.getByRole('option', { name: 'F1' }));

    expect(onUpdate).toHaveBeenCalledWith(0, 'primaryMetric', 'f1');
  });

  it('should update the selected metric direction when metrics have different directions', () => {
    const onUpdate = jest.fn();
    renderAccordion({
      onUpdate,
      benchmarks: [
        {
          ...benchmarks[0],
          availableMetrics: ['accuracy', 'perplexity'],
          metricDirections: { accuracy: false, perplexity: true },
        },
      ],
    });

    fireEvent.click(screen.getByTestId('benchmark-metric-toggle-0'));
    fireEvent.click(screen.getByRole('option', { name: 'Perplexity' }));

    expect(onUpdate).toHaveBeenNthCalledWith(1, 0, 'primaryMetric', 'perplexity');
    expect(onUpdate).toHaveBeenNthCalledWith(2, 0, 'lowerIsBetter', true);
  });

  it('should update the sample count, few-shot example count, and threshold', () => {
    const onUpdate = jest.fn();
    renderAccordion({ onUpdate, benchmarks: [{ ...benchmarks[0], datasetSize: 817 }] });

    fireEvent.change(screen.getByTestId('benchmark-samples-input-0'), {
      target: { value: '500' },
    });
    fireEvent.change(screen.getByTestId('benchmark-few-shot-input-0'), {
      target: { value: '9' },
    });
    const thresholdInput = screen.getAllByRole('spinbutton', { name: 'Threshold' })[0];
    fireEvent.change(thresholdInput, {
      target: { value: '85' },
    });
    fireEvent.blur(thresholdInput);

    expect(onUpdate).toHaveBeenCalledWith(0, 'numSamples', 500);
    expect(onUpdate).toHaveBeenCalledWith(0, 'numFewShot', 9);
    expect(onUpdate).toHaveBeenCalledWith(0, 'threshold', 85);
  });

  it('should clamp sample count to at least 1 and at most the dataset size', () => {
    const onUpdate = jest.fn();
    renderAccordion({
      onUpdate,
      benchmarks: [{ ...benchmarks[0], datasetSize: 200 }],
    });

    fireEvent.change(screen.getByTestId('benchmark-samples-input-0'), {
      target: { value: '0' },
    });
    expect(onUpdate).toHaveBeenCalledWith(0, 'numSamples', 1);

    fireEvent.change(screen.getByTestId('benchmark-samples-input-0'), {
      target: { value: '500' },
    });
    expect(onUpdate).toHaveBeenCalledWith(0, 'numSamples', 200);
  });

  it('should expose min and max attributes when dataset size is available', () => {
    renderAccordion({ benchmarks: [{ ...benchmarks[0], datasetSize: 200 }] });

    expect(screen.getByTestId('benchmark-samples-input-0')).toHaveAttribute('min', '1');
    expect(screen.getByTestId('benchmark-samples-input-0')).toHaveAttribute('max', '200');
  });

  it('should omit the max attribute when dataset size is unavailable', () => {
    renderAccordion({ benchmarks: [benchmarks[0]] });

    expect(screen.getByTestId('benchmark-samples-input-0')).toHaveAttribute('min', '1');
    expect(screen.getByTestId('benchmark-samples-input-0')).not.toHaveAttribute('max');
  });

  it('should allow clearing the sample count', () => {
    const onUpdate = jest.fn();
    renderAccordion({ onUpdate, benchmarks: [{ ...benchmarks[0], datasetSize: 200 }] });

    fireEvent.change(screen.getByTestId('benchmark-samples-input-0'), {
      target: { value: '' },
    });

    expect(onUpdate).toHaveBeenCalledWith(0, 'numSamples', undefined);
  });

  it('should remove a benchmark when requested', () => {
    const onRemove = jest.fn();
    renderAccordion({ onRemove });

    fireEvent.click(screen.getByTestId('remove-benchmark-1'));

    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('should hide remove actions when the final benchmark cannot be removed', () => {
    renderAccordion({ benchmarks: [benchmarks[0]], canRemove: false });

    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('should show an empty state when no benchmarks are configured', () => {
    renderAccordion({ benchmarks: [], canRemove: false });

    expect(screen.getByTestId('no-benchmarks-message')).toHaveTextContent(
      'No benchmarks configured. Add benchmarks to continue.',
    );
  });
});
