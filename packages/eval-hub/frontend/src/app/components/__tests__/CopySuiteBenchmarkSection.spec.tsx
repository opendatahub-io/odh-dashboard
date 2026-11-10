import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CopySuiteBenchmarkSection from '~/app/components/CopySuiteBenchmarkSection';
import type { CopySuiteBenchmark } from '~/app/pages/useCopySuiteForm';
import { testDataRefDefaultValues } from '~/app/schemas/testDataRef.schema';

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
  testDataRef: { ...testDataRefDefaultValues },
  threshold: 70,
  availableMetrics: [],
};

const JUDGE_MODEL_KEY = 'judge_model';

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
    expect(screen.getByRole('button', { name: 'True' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'False' })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'False' }));

    expect(onUpdate).toHaveBeenCalledWith(
      0,
      'parameters',
      expect.arrayContaining([{ key: 'enabled', type: 'boolean', value: false }]),
    );
  });

  it('should mark configured parameters as required and show their descriptions', () => {
    renderSection({
      benchmark: {
        ...benchmark,
        parameters: [
          { key: JUDGE_MODEL_KEY, type: 'text', value: 'gpt-4o' },
          { key: 'other', type: 'text', value: 'value' },
        ],
      },
      parameterConfig: {
        [JUDGE_MODEL_KEY]: {
          required: true,
          description: 'The language model used to score and evaluate the responses.',
        },
      },
    });

    expect(screen.getByText('Judge model')).toBeInTheDocument();
    expect(screen.getByTestId(`benchmark-0-parameter-help-${JUDGE_MODEL_KEY}`)).toHaveTextContent(
      'The language model used to score and evaluate the responses.',
    );
    expect(screen.queryByTestId('benchmark-0-parameter-help-other')).not.toBeInTheDocument();
  });

  it('should surface required parameter validation errors only after the field is edited', () => {
    renderSection({
      benchmark: {
        ...benchmark,
        parameters: [{ key: JUDGE_MODEL_KEY, type: 'text', value: 'gpt-4o' }],
      },
      parameterErrors: { [JUDGE_MODEL_KEY]: 'Judge model is required.' },
    });

    expect(
      screen.queryByTestId(`benchmark-0-parameter-error-${JUDGE_MODEL_KEY}`),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Judge model')).not.toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(screen.getByLabelText('Judge model'), { target: { value: '' } });

    expect(screen.getByTestId(`benchmark-0-parameter-error-${JUDGE_MODEL_KEY}`)).toHaveTextContent(
      'Judge model is required.',
    );
    expect(screen.getByLabelText('Judge model')).toHaveAttribute('aria-invalid', 'true');
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

  it('should render the test data source selector with a None default', () => {
    renderSection();

    expect(screen.getByTestId('benchmark-test-data-ref-0-source-toggle')).toHaveTextContent(
      'None (use benchmark default data)',
    );
  });

  it('should clear previous source values when the test data source changes', () => {
    const onUpdate = jest.fn();
    renderSection({
      onUpdate,
      benchmark: {
        ...benchmark,
        testDataRef: {
          ...testDataRefDefaultValues,
          source: 's3',
          bucket: 'eval-data',
          key: 'ragas/data.jsonl',
          secretRef: 'my-secret',
        },
      },
    });

    fireEvent.click(screen.getByTestId('benchmark-test-data-ref-0-source-toggle'));
    fireEvent.click(screen.getByRole('option', { name: 'Git repository' }));

    expect(onUpdate).toHaveBeenCalledWith(0, 'testDataRef', {
      ...testDataRefDefaultValues,
      source: 'git',
    });
  });

  it('should surface test data ref validation errors', () => {
    renderSection({
      benchmark: {
        ...benchmark,
        testDataRef: { ...testDataRefDefaultValues, source: 's3', bucket: 'eval-data' },
      },
      testDataRefErrors: { key: 'Key is required.', secretRef: 'Secret is required.' },
    });

    fireEvent.blur(screen.getByTestId('benchmark-test-data-ref-0-key'));
    fireEvent.blur(screen.getByTestId('benchmark-test-data-ref-0-secretRef'));

    expect(screen.getByTestId('benchmark-test-data-ref-0-key-error')).toHaveTextContent(
      'Key is required.',
    );
    expect(screen.getByTestId('benchmark-test-data-ref-0-secretRef-error')).toHaveTextContent(
      'Secret is required.',
    );
  });
});
