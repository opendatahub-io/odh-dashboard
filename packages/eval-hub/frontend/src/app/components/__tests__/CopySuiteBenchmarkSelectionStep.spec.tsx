/* eslint-disable camelcase */
import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CopySuiteBenchmarkSelectionStep from '~/app/components/CopySuiteBenchmarkSelectionStep';
import type { Provider } from '~/app/types';

jest.mock('~/app/components/CopySuiteBenchmarkDetailsOverlay', () => ({
  __esModule: true,
  default: ({
    isOpen,
    onPrimaryAction,
    primaryActionLabel,
  }: {
    isOpen: boolean;
    onPrimaryAction: () => void;
    primaryActionLabel: string;
  }) =>
    isOpen ? (
      <div data-testid="copy-suite-benchmark-details-overlay">
        {primaryActionLabel}
        <button type="button" onClick={onPrimaryAction}>
          Apply selection
        </button>
      </div>
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
    expect(screen.getByTestId('copy-suite-select-benchmarks-title')).toHaveClass('pf-m-2xl');
    expect(
      screen.getByRole('heading', { name: 'Select benchmarks', level: 1 }),
    ).toBeInTheDocument();
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

  it('should format underscore-separated target type labels', () => {
    renderSelectionStep({
      providers: [
        {
          resource: { id: 'provider-target-types' },
          name: 'provider-target-types',
          agent: {
            evaluates: ['Reading_comprehension', 'Instruction_following'],
            target_type: 'model',
          },
          benchmarks: [
            {
              id: 'target-types',
              name: 'Target type labels',
              category: 'general',
              metrics: ['accuracy'],
            },
          ],
        },
      ],
      selectedBenchmarkKeys: ['provider-target-types:target-types'],
    });

    expect(screen.getByText('Reading comprehension')).toBeInTheDocument();
    expect(screen.getByText('Instruction following')).toBeInTheDocument();
    expect(screen.getByText(/model/i)).toBeInTheDocument();
    expect(screen.queryByText('Reading_comprehension')).not.toBeInTheDocument();

    const evaluatesCell = screen.getByText('Instruction following').closest('td');
    expect(
      Array.from(evaluatesCell?.querySelectorAll('.pf-v6-c-label__text') ?? []).map(
        (label) => label.textContent,
      ),
    ).toEqual(['Instruction following', 'Model', 'Reading comprehension']);
  });

  it('should include model when provider metadata declares another target', () => {
    renderSelectionStep({
      providers: [
        {
          resource: { id: 'provider-agent-target' },
          name: 'provider-agent-target',
          agent: { evaluates: ['agent'] },
          benchmarks: [
            {
              id: 'agent-target',
              name: 'Agent target benchmark',
              category: 'general',
              metrics: ['accuracy'],
            },
          ],
        },
      ],
      selectedBenchmarkKeys: ['provider-agent-target:agent-target'],
    });

    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('Model')).toBeInTheDocument();
  });

  it('should default to model when provider target metadata is absent', () => {
    renderSelectionStep({
      providers: [
        {
          resource: { id: 'provider-without-target-type' },
          name: 'provider-without-target-type',
          benchmarks: [
            {
              id: 'benchmark-without-target-type',
              name: 'Benchmark without target type',
              category: 'general',
              metrics: ['accuracy'],
            },
          ],
        },
      ],
      selectedBenchmarkKeys: ['provider-without-target-type:benchmark-without-target-type'],
    });

    expect(screen.getByText('Model')).toBeInTheDocument();
    expect(screen.queryByText('Unspecified')).not.toBeInTheDocument();
  });

  it('should filter benchmarks by evaluates target', () => {
    renderSelectionStep({
      providers: [
        {
          resource: { id: 'provider-agent' },
          name: 'provider-agent',
          agent: { evaluates: ['agent'] },
          benchmarks: [
            {
              id: 'agent-benchmark',
              name: 'Agent benchmark',
              category: 'general',
              metrics: ['accuracy'],
            },
          ],
        },
        {
          resource: { id: 'provider-model' },
          name: 'provider-model',
          agent: { evaluates: ['model'] },
          benchmarks: [
            {
              id: 'model-benchmark',
              name: 'Model benchmark',
              category: 'general',
              metrics: ['accuracy'],
            },
          ],
        },
      ],
      selectedBenchmarkKeys: [],
    });

    fireEvent.click(screen.getByTestId('benchmark-catalog-evaluates-filter'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Agent' }));

    expect(screen.getByTestId('benchmark-catalog-evaluates-filter-badge')).toHaveTextContent('1');
    expect(screen.getByTestId('benchmark-catalog-checkbox-agent-benchmark')).toBeInTheDocument();
    expect(
      screen.queryByTestId('benchmark-catalog-checkbox-model-benchmark'),
    ).not.toBeInTheDocument();
  });

  it('should preselect benchmark categories mapped from the collection categories', () => {
    renderSelectionStep({
      providers: [
        {
          resource: { id: 'provider-one' },
          name: 'provider-one',
          benchmarks: [
            { id: 'code', name: 'Code benchmark', category: 'Code', metrics: ['accuracy'] },
            {
              id: 'reasoning',
              name: 'Reasoning benchmark',
              category: 'Reasoning',
              metrics: ['accuracy'],
            },
          ],
        },
      ],
      selectedBenchmarkKeys: [],
      collectionCategories: ['software'],
    });

    expect(screen.getByTestId('benchmark-catalog-category-filter-badge')).toHaveTextContent('1');
    const prefilterAlert = screen.getByTestId('benchmark-catalog-prefilter-alert');
    expect(prefilterAlert).toHaveTextContent(
      'Filters were applied automatically to show benchmarks matching the selected collection category.',
    );
    expect(prefilterAlert).toHaveClass('pf-m-plain');
    expect(prefilterAlert.closest('.pf-v6-c-toolbar')).toBeInTheDocument();
    expect(prefilterAlert).not.toHaveTextContent('Clear all filters');
    expect(screen.getByTestId('benchmark-catalog-checkbox-code')).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-catalog-checkbox-reasoning')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));

    expect(screen.queryByTestId('benchmark-catalog-prefilter-alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('benchmark-catalog-checkbox-reasoning')).toBeInTheDocument();

    // restore the original prefilter by re-selecting the category — the alert must stay hidden
    fireEvent.click(screen.getByTestId('benchmark-catalog-category-filter'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Code' }));

    expect(screen.getByTestId('benchmark-catalog-category-filter-badge')).toHaveTextContent('1');
    expect(screen.queryByTestId('benchmark-catalog-checkbox-reasoning')).not.toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-catalog-prefilter-alert')).not.toBeInTheDocument();
  });

  it('should preselect providers represented by existing benchmarks', () => {
    renderSelectionStep({
      providers: [
        {
          resource: { id: 'provider-one' },
          name: 'provider-one',
          title: 'Provider One',
          benchmarks: [
            { id: 'code', name: 'Code benchmark', category: 'Code', metrics: ['accuracy'] },
          ],
        },
        {
          resource: { id: 'provider-two' },
          name: 'provider-two',
          title: 'Provider Two',
          benchmarks: [
            {
              id: 'reasoning',
              name: 'Reasoning benchmark',
              category: 'Reasoning',
              metrics: ['accuracy'],
            },
          ],
        },
      ],
      selectedBenchmarkKeys: ['provider-one:code'],
      collectionCategories: [],
      prefilterProviders: true,
    });

    expect(screen.getByTestId('benchmark-catalog-framework-filter-badge')).toHaveTextContent('1');
    // framework-only prefilter (no collection categories) must still surface the alert
    expect(screen.getByTestId('benchmark-catalog-prefilter-alert')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-catalog-checkbox-code')).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-catalog-checkbox-reasoning')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));

    expect(screen.queryByTestId('benchmark-catalog-prefilter-alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('benchmark-catalog-checkbox-reasoning')).toBeInTheDocument();
  });

  it('should apply mapped benchmark categories when collection categories arrive after mount', async () => {
    const props: React.ComponentProps<typeof CopySuiteBenchmarkSelectionStep> = {
      providers: [
        {
          resource: { id: 'provider-one' },
          name: 'provider-one',
          benchmarks: [
            { id: 'code', name: 'Code benchmark', category: 'Code', metrics: ['accuracy'] },
            {
              id: 'reasoning',
              name: 'Reasoning benchmark',
              category: 'Reasoning',
              metrics: ['accuracy'],
            },
          ],
        },
      ],
      selectedBenchmarkKeys: [],
      collectionCategories: [],
      onNext: jest.fn(),
      onBack: jest.fn(),
      onCancel: jest.fn(),
    };
    const { rerender } = render(<CopySuiteBenchmarkSelectionStep {...props} />);

    rerender(<CopySuiteBenchmarkSelectionStep {...props} collectionCategories={['software']} />);

    await waitFor(() => {
      expect(screen.getByTestId('benchmark-catalog-category-filter-badge')).toHaveTextContent('1');
      expect(screen.getByTestId('benchmark-catalog-checkbox-code')).toBeInTheDocument();
      expect(screen.queryByTestId('benchmark-catalog-checkbox-reasoning')).not.toBeInTheDocument();
    });
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
    const providerMany = createProvidersWithBenchmarks(21);
    const initiallySelectedKeys = [
      ...Array.from(
        { length: 19 },
        (_, index) => `provider-many:benchmark-${String(index).padStart(2, '0')}`,
      ),
      'provider-many:benchmark-20',
    ];
    renderSelectionStep({ providers: providerMany, selectedBenchmarkKeys: initiallySelectedKeys });

    expect(screen.getByTestId('benchmark-catalog-limit-message')).toHaveTextContent(
      '0 out of 20 remaining',
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Go to next page' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Go to next page' })[0]);
    expect(screen.getByTestId('benchmark-catalog-checkbox-benchmark-19')).toBeDisabled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Go to previous page' })[0]);
    fireEvent.click(screen.getByTestId('benchmark-catalog-checkbox-benchmark-10'));

    expect(screen.getByTestId('benchmark-catalog-limit-message')).toHaveTextContent(
      '1 out of 20 remaining',
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Go to next page' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Go to next page' })[0]);
    const releasedBenchmark = screen.getByTestId('benchmark-catalog-checkbox-benchmark-19');
    expect(releasedBenchmark).not.toBeDisabled();
    fireEvent.click(releasedBenchmark);
    expect(screen.getByTestId('benchmark-catalog-limit-message')).toHaveTextContent(
      '0 out of 20 remaining',
    );
  });

  it('should reject an over-limit selection until it is reduced', () => {
    const providerMany = createProvidersWithBenchmarks(21);
    const initiallySelectedKeys = Array.from(
      { length: 21 },
      (_, index) => `provider-many:benchmark-${String(index).padStart(2, '0')}`,
    );
    const { onNext } = renderSelectionStep({
      providers: providerMany,
      selectedBenchmarkKeys: initiallySelectedKeys,
    });

    expect(screen.getByTestId('benchmark-catalog-limit-message')).toHaveTextContent(
      'Invalid selection: 21 benchmarks selected. Select no more than 20.',
    );
    expect(screen.getByTestId('benchmark-catalog-limit-message')).not.toHaveTextContent(
      '-1 out of 20 remaining',
    );
    expect(screen.getByTestId('copy-suite-next-select-benchmarks')).toBeDisabled();
    expect(onNext).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('benchmark-catalog-checkbox-benchmark-00'));

    expect(screen.getByTestId('copy-suite-next-select-benchmarks')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('copy-suite-next-select-benchmarks'));
    expect(onNext).toHaveBeenCalledWith(initiallySelectedKeys.slice(1));
  });

  it('should open benchmark details in a drawer overlay', () => {
    renderSelectionStep();

    fireEvent.click(screen.getByTestId('benchmark-catalog-name-mmlu'));

    expect(screen.getByTestId('benchmark-catalog-checkbox-mmlu')).not.toBeChecked();
    expect(screen.getByTestId('copy-suite-benchmark-details-overlay')).toHaveTextContent(
      'Select benchmark',
    );
  });

  it('should keep the details overlay open when selecting at the benchmark limit', () => {
    const providerMany = createProvidersWithBenchmarks(21);
    const initiallySelectedKeys = Array.from(
      { length: 20 },
      (_, index) => `provider-many:benchmark-${String(index).padStart(2, '0')}`,
    );
    renderSelectionStep({ providers: providerMany, selectedBenchmarkKeys: initiallySelectedKeys });

    fireEvent.click(screen.getAllByRole('button', { name: 'Go to next page' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Go to next page' })[0]);
    fireEvent.click(screen.getByTestId('benchmark-catalog-name-benchmark-20'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply selection' }));

    expect(screen.getByTestId('copy-suite-benchmark-details-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('benchmark-catalog-limit-message')).toHaveTextContent(
      '0 out of 20 remaining',
    );
  });
});
