import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CopySuiteBenchmarkSection from '~/app/components/CopySuiteBenchmarkSection';
import type { CopySuiteBenchmark } from '~/app/pages/useCopySuiteForm';

jest.mock('~/app/components/BenchmarkThresholdField', () => ({
  __esModule: true,
  default: ({ isDisabled }: { isDisabled?: boolean }) => (
    <button type="button" data-testid="benchmark-threshold-field" disabled={isDisabled}>
      Benchmark threshold
    </button>
  ),
}));

const benchmark: CopySuiteBenchmark = {
  id: 'benchmark-one',
  providerId: 'provider-one',
  name: 'Benchmark One',
  weight: 0.2,
  parameters: [],
  threshold: 70,
  availableMetrics: [],
};

const renderSection = (
  overrides: Partial<React.ComponentProps<typeof CopySuiteBenchmarkSection>> = {},
) =>
  render(
    <CopySuiteBenchmarkSection
      benchmark={benchmark}
      index={0}
      showWeightEdit
      weightRatio={1}
      totalWeightRatio={5}
      onUpdate={jest.fn()}
      onEditWeights={jest.fn()}
      onOpenDetails={jest.fn()}
      {...overrides}
    />,
  );

describe('CopySuiteBenchmarkSection', () => {
  it('should display the supplied ratio of the overall suite weight', () => {
    renderSection({ weightRatio: 1, totalWeightRatio: 5 });

    expect(screen.getByTestId('benchmark-weight-label-0')).toHaveTextContent('1 of 5');
  });

  it('should surface advanced parameter validation errors', () => {
    renderSection({
      benchmark: {
        ...benchmark,
        parameters: [{ key: 'limit', type: 'number', value: 20 }],
        additionalParameters: '{"limit": 20}',
      },
      additionalParametersError: 'Use the dedicated fields for limit.',
    });

    expect(screen.getByTestId('benchmark-additional-parameters-error-0')).toHaveTextContent(
      'Use the dedicated fields for limit.',
    );
  });

  it('should render dynamic benchmark parameters with the API value type', () => {
    const onUpdate = jest.fn();
    renderSection({
      onUpdate,
      benchmark: {
        ...benchmark,
        parameters: [
          { key: 'secondary_threshold', type: 'number', value: 0.7 },
          { key: 'secondary_metric', type: 'text', value: 'accuracy_amb' },
          { key: 'enabled', type: 'boolean', value: true },
        ],
      },
    });

    expect(screen.getByLabelText('Secondary metric')).toHaveValue('accuracy_amb');
    expect(screen.getByLabelText('Secondary threshold')).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('Enabled')).toBeChecked();

    fireEvent.click(screen.getByLabelText('Enabled'));

    expect(onUpdate).toHaveBeenCalledWith(
      0,
      'parameters',
      expect.arrayContaining([{ key: 'enabled', type: 'boolean', value: false }]),
    );
  });

  it('should close and disable a primary-metric menu when interaction is locked', async () => {
    const metricBenchmark: CopySuiteBenchmark = {
      ...benchmark,
      availableMetrics: ['acc', 'f1'],
      primaryMetric: 'acc',
    };
    const props = {
      benchmark: metricBenchmark,
      index: 0,
      showWeightEdit: true,
      weightRatio: 1,
      totalWeightRatio: 5,
      onUpdate: jest.fn(),
      onEditWeights: jest.fn(),
      onOpenDetails: jest.fn(),
    };
    const { rerender } = render(<CopySuiteBenchmarkSection {...props} />);

    fireEvent.click(screen.getByTestId('benchmark-metric-toggle-0'));
    await waitFor(() => expect(screen.getByRole('option', { name: 'F1' })).toBeInTheDocument());

    rerender(<CopySuiteBenchmarkSection {...props} isInteractionDisabled />);

    expect(screen.getByTestId('benchmark-metric-toggle-0')).toBeDisabled();
    await waitFor(() =>
      expect(screen.queryByRole('option', { name: 'F1' })).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('benchmark-threshold-field')).toBeDisabled();
  });

  it('should disable benchmark file uploads when interaction is locked', () => {
    renderSection({
      isInteractionDisabled: true,
      benchmark: { ...benchmark, additionalParameters: '{"temperature": 0.5}' },
    });

    const fileUpload = screen.getByTestId('benchmark-additional-parameters-0');
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    expect(fileUpload.querySelector('textarea')).toBeDisabled();
  });
});
