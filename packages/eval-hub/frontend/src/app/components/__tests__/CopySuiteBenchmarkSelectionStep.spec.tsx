/* eslint-disable camelcase */
import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CopySuiteBenchmarkSelectionStep from '~/app/components/CopySuiteBenchmarkSelectionStep';
import type { Provider } from '~/app/types';

jest.mock('~/app/components/CopySuiteBenchmarkDetailsOverlay', () => ({
  __esModule: true,
  default: ({ isOpen, primaryActionLabel }: { isOpen: boolean; primaryActionLabel: string }) =>
    isOpen ? (
      <div data-testid="copy-suite-benchmark-details-overlay">{primaryActionLabel}</div>
    ) : null,
}));

const providers: Provider[] = [
  {
    resource: { id: 'provider-one' },
    name: 'garak',
    title: 'Garak',
    agent: { evaluates: ['model', 'guardrails'] },
    benchmarks: [
      {
        id: 'planning',
        name: 'Planning quality',
        category: 'general',
        metrics: ['step_ordering'],
      },
      {
        id: 'tasks',
        name: 'Task completion',
        category: 'general',
        metrics: ['task_completion'],
      },
    ],
  },
  {
    resource: { id: 'provider-two' },
    name: 'other',
    benchmarks: [
      {
        id: 'mmlu',
        name: '57-Subject knowledge test',
        category: 'knowledge',
        metrics: ['acc'],
      },
    ],
  },
];

const createProvidersWithBenchmarks = (count: number): Provider[] => [
  {
    resource: { id: 'provider-many' },
    name: 'Provider many',
    benchmarks: Array.from({ length: count }, (_, index) => {
      const suffix = String(index).padStart(2, '0');
      return {
        id: `benchmark-${suffix}`,
        name: `Benchmark ${suffix}`,
        category: 'general',
        metrics: ['accuracy'],
      };
    }),
  },
];

const renderSelectionStep = (
  overrides: Partial<React.ComponentProps<typeof CopySuiteBenchmarkSelectionStep>> = {},
) => {
  const onNext = jest.fn();
  const onBack = jest.fn();
  const onCancel = jest.fn();

  render(
    <CopySuiteBenchmarkSelectionStep
      providers={providers}
      selectedBenchmarkKeys={['provider-one:planning', 'provider-one:tasks']}
      onNext={onNext}
      onBack={onBack}
      onCancel={onCancel}
      {...overrides}
    />,
  );

  return { onNext, onBack, onCancel };
};

describe('CopySuiteBenchmarkSelectionStep', () => {
  it('should render selected benchmarks on the flat page', () => {
    renderSelectionStep();

    expect(screen.getByTestId('copy-suite-step-select-benchmarks')).toBeInTheDocument();
    expect(screen.getByText('Select benchmarks')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-catalog-checkbox-planning')).toBeChecked();
    expect(screen.getByTestId('benchmark-catalog-checkbox-tasks')).toBeChecked();
    expect(screen.getByTestId('benchmark-catalog-checkbox-mmlu')).not.toBeChecked();
    const selectedRow = screen.getByTestId('benchmark-catalog-checkbox-planning').closest('tr');
    expect(selectedRow).toHaveClass('pf-m-clickable', 'pf-m-selected');
    expect(selectedRow).toHaveAttribute('aria-label', 'Row selected');
    expect(screen.getByTestId('benchmark-catalog-limit-message')).toHaveClass(
      'evalhub-copy-suite-benchmark-catalog__limit-message',
    );
    expect(
      screen.queryByTestId('copy-suite-add-benchmarks-catalog-drawer'),
    ).not.toBeInTheDocument();
  });

  it('should show selected benchmarks first with each group sorted alphabetically', () => {
    renderSelectionStep({
      selectedBenchmarkKeys: ['provider-one:tasks', 'provider-two:mmlu'],
    });

    expect(
      Array.from(screen.getByTestId('benchmark-catalog-table').querySelectorAll('tbody tr')).map(
        (row) => row.querySelector('button')?.textContent,
      ),
    ).toEqual(['57-Subject knowledge test', 'Task completion', 'Planning quality']);
  });

  it('should stage selection changes until Next is clicked', () => {
    const { onNext } = renderSelectionStep();

    fireEvent.click(
      screen.getByTestId('benchmark-catalog-checkbox-mmlu').closest('tr') as HTMLElement,
    );

    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByTestId('benchmark-catalog-checkbox-mmlu')).toBeChecked();
    fireEvent.click(screen.getByTestId('copy-suite-next-select-benchmarks'));

    expect(onNext).toHaveBeenCalledWith([
      'provider-one:planning',
      'provider-one:tasks',
      'provider-two:mmlu',
    ]);
  });

  it('should disable Next when no benchmark is selected', () => {
    renderSelectionStep({ selectedBenchmarkKeys: [] });

    expect(screen.getByTestId('copy-suite-next-select-benchmarks')).toBeDisabled();
  });

  it('should call Back and Cancel from the page footer', () => {
    const { onBack, onCancel } = renderSelectionStep();

    fireEvent.click(screen.getByTestId('copy-suite-back-select-benchmarks'));
    fireEvent.click(screen.getByTestId('copy-suite-cancel-select-benchmarks'));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should filter by benchmark name and show an empty state when nothing matches', () => {
    renderSelectionStep();

    fireEvent.change(screen.getByRole('textbox', { name: 'Search benchmarks' }), {
      target: { value: 'knowledge' },
    });

    expect(screen.getByText('57-Subject knowledge test')).toBeInTheDocument();
    expect(screen.queryByText('Planning quality')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Search benchmarks' }), {
      target: { value: 'not-a-benchmark' },
    });

    expect(screen.getByTestId('benchmark-catalog-empty')).toHaveTextContent(
      'No benchmarks match the filter criteria. Try adjusting or clearing your filters.',
    );
  });

  it('should paginate the benchmark catalog', () => {
    renderSelectionStep({
      providers: createProvidersWithBenchmarks(11),
      selectedBenchmarkKeys: [],
    });

    expect(screen.getByTestId('benchmark-catalog-checkbox-benchmark-00')).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-catalog-checkbox-benchmark-10')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Go to next page' })[0]);

    expect(screen.getByTestId('benchmark-catalog-checkbox-benchmark-10')).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-catalog-checkbox-benchmark-00')).not.toBeInTheDocument();
  });

  it('should move a benchmark selected on a later page to the first page', () => {
    renderSelectionStep({
      providers: createProvidersWithBenchmarks(21),
      selectedBenchmarkKeys: [],
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Go to next page' })[0]);
    fireEvent.click(screen.getByTestId('benchmark-catalog-checkbox-benchmark-10'));

    expect(screen.getByTestId('benchmark-catalog-checkbox-benchmark-10')).toBeChecked();
    expect(screen.getByTestId('benchmark-catalog-checkbox-benchmark-00')).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-catalog-checkbox-benchmark-09')).not.toBeInTheDocument();
  });

  it('should enforce and release the benchmark selection limit', () => {
    const providerMany = createProvidersWithBenchmarks(11);
    const initiallySelectedKeys = [
      ...Array.from(
        { length: 9 },
        (_, index) => `provider-many:benchmark-${String(index).padStart(2, '0')}`,
      ),
      'provider-many:benchmark-10',
    ];
    renderSelectionStep({ providers: providerMany, selectedBenchmarkKeys: initiallySelectedKeys });

    expect(screen.getByTestId('benchmark-catalog-limit-message')).toHaveTextContent(
      '0 out of 10 remaining',
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Go to next page' })[0]);
    expect(screen.getByTestId('benchmark-catalog-checkbox-benchmark-09')).toBeDisabled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Go to previous page' })[0]);
    fireEvent.click(screen.getByTestId('benchmark-catalog-checkbox-benchmark-00'));

    expect(screen.getByTestId('benchmark-catalog-checkbox-benchmark-00')).not.toBeDisabled();
  });

  it('should open benchmark details in a drawer overlay', () => {
    renderSelectionStep();

    fireEvent.click(screen.getByTestId('benchmark-catalog-name-mmlu'));

    expect(screen.getByTestId('benchmark-catalog-checkbox-mmlu')).not.toBeChecked();
    expect(screen.getByTestId('copy-suite-benchmark-details-overlay')).toHaveTextContent(
      'Select benchmark',
    );
  });
});
