/* eslint-disable camelcase */
import * as React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CopySuiteBenchmarkCatalogDrawer from '~/app/components/CopySuiteBenchmarkCatalogDrawer';
import type { Provider } from '~/app/types';

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

const StatefulCatalogDrawer: React.FC<
  Partial<React.ComponentProps<typeof CopySuiteBenchmarkCatalogDrawer>> & {
    initialSelectedBenchmarkKeys?: string[];
  }
> = ({
  initialSelectedBenchmarkKeys = ['provider-one:planning', 'provider-one:tasks'],
  selectedBenchmarkKeys,
  onSelectionChange,
  onOpenDetails = jest.fn(),
  ...overrides
}) => {
  const [keys, setKeys] = React.useState(selectedBenchmarkKeys ?? initialSelectedBenchmarkKeys);

  React.useEffect(() => {
    if (selectedBenchmarkKeys) {
      setKeys(selectedBenchmarkKeys);
    }
  }, [selectedBenchmarkKeys]);

  return (
    <CopySuiteBenchmarkCatalogDrawer
      providers={providers}
      selectedBenchmarkKeys={keys}
      onSelectionChange={(nextKeys) => {
        setKeys(nextKeys);
        onSelectionChange?.(nextKeys);
      }}
      onSave={jest.fn()}
      onClose={jest.fn()}
      onOpenDetails={onOpenDetails}
      {...overrides}
    />
  );
};

const renderDrawer = (
  overrides: Partial<React.ComponentProps<typeof CopySuiteBenchmarkCatalogDrawer>> & {
    initialSelectedBenchmarkKeys?: string[];
  } = {},
) => render(<StatefulCatalogDrawer {...overrides} />);

describe('CopySuiteBenchmarkCatalogDrawer', () => {
  it('should render the catalog table with selected benchmarks checked', () => {
    renderDrawer();

    expect(screen.getByText('Add remove benchmarks')).toBeInTheDocument();
    expect(
      document.querySelectorAll('#copy-suite-add-benchmarks-catalog-drawer-content'),
    ).toHaveLength(1);
    expect(
      document.querySelectorAll('#copy-suite-add-benchmarks-catalog-drawer-panel'),
    ).toHaveLength(1);
    expect(screen.getByTestId('benchmark-catalog-checkbox-planning')).toBeChecked();
    expect(screen.getByTestId('benchmark-catalog-checkbox-tasks')).toBeChecked();
    expect(screen.getByTestId('benchmark-catalog-checkbox-mmlu')).not.toBeChecked();
  });

  it('should save the selected benchmark keys', () => {
    const onSave = jest.fn();
    renderDrawer({ onSave });

    fireEvent.click(screen.getByTestId('benchmark-catalog-checkbox-mmlu'));
    fireEvent.click(screen.getByTestId('benchmark-catalog-save'));

    expect(onSave).toHaveBeenCalledWith([
      'provider-one:planning',
      'provider-one:tasks',
      'provider-two:mmlu',
    ]);
  });

  it('should filter by benchmark name and show an empty state when nothing matches', () => {
    renderDrawer();

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

  it('should clear all active filters', () => {
    renderDrawer();

    fireEvent.change(screen.getByRole('textbox', { name: 'Search benchmarks' }), {
      target: { value: 'knowledge' },
    });
    expect(screen.queryByText('Planning quality')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));

    expect(screen.getByText('Planning quality')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search benchmarks' })).toHaveValue('');
  });

  it('should paginate the benchmark catalog', () => {
    renderDrawer({
      providers: createProvidersWithBenchmarks(11),
      initialSelectedBenchmarkKeys: [],
    });

    expect(screen.getByTestId('benchmark-catalog-checkbox-benchmark-00')).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-catalog-checkbox-benchmark-10')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Go to next page' })[0]);

    expect(screen.getByTestId('benchmark-catalog-checkbox-benchmark-10')).toBeInTheDocument();
    expect(screen.queryByTestId('benchmark-catalog-checkbox-benchmark-00')).not.toBeInTheDocument();
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
    renderDrawer({ providers: providerMany, initialSelectedBenchmarkKeys: initiallySelectedKeys });

    expect(screen.getByTestId('benchmark-catalog-limit-message')).toHaveTextContent(
      '0 out of 10 remaining',
    );
    expect(screen.getByTestId('benchmark-catalog-checkbox-benchmark-09')).toBeDisabled();

    fireEvent.click(screen.getByTestId('benchmark-catalog-checkbox-benchmark-00'));

    expect(screen.getByTestId('benchmark-catalog-checkbox-benchmark-09')).not.toBeDisabled();
  });

  it('should close without saving when cancelled', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    renderDrawer({ onSave, onClose });

    fireEvent.click(screen.getByTestId('benchmark-catalog-cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('should call onOpenDetails when a benchmark name is clicked', () => {
    const onOpenDetails = jest.fn();
    renderDrawer({ onOpenDetails });

    fireEvent.click(screen.getByTestId('benchmark-catalog-name-planning'));

    expect(onOpenDetails).toHaveBeenCalledWith('provider-one:planning');
  });

  it('should highlight the active benchmark row when details are open', () => {
    renderDrawer({ detailsBenchmarkKey: 'provider-one:planning' });

    expect(screen.getByTestId('benchmark-catalog-name-planning').closest('tr')).toHaveClass(
      'evalhub-copy-suite-benchmark-catalog__row--active',
    );
  });

  it('should label the drawer and focus the panel when it opens', async () => {
    renderDrawer();

    const dialog = screen.getByRole('dialog', { name: 'Add remove benchmarks' });

    const transitionEnd = new Event('transitionend', { bubbles: true });
    Object.defineProperty(transitionEnd, 'propertyName', { value: 'transform' });
    act(() => dialog.dispatchEvent(transitionEnd));
    await waitFor(() => expect(dialog).toHaveFocus());
    expect(dialog).toHaveAttribute('aria-labelledby', 'copy-suite-add-benchmarks-catalog-title');
  });

  it('should close the details overlay before closing the catalog on Escape', () => {
    const onClose = jest.fn();
    const onOpenDetails = jest.fn();
    renderDrawer({
      detailsBenchmarkKey: 'provider-one:planning',
      onClose,
      onOpenDetails,
    });

    fireEvent.keyDown(screen.getByTestId('copy-suite-add-benchmarks-catalog-drawer'), {
      key: 'Escape',
    });

    expect(onOpenDetails).toHaveBeenCalledWith(undefined);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should close the catalog on Escape when the details overlay is closed', () => {
    const onClose = jest.fn();
    renderDrawer({ onClose });

    fireEvent.keyDown(screen.getByTestId('copy-suite-add-benchmarks-catalog-drawer'), {
      key: 'Escape',
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should close an open filter menu without closing the catalog on Escape', () => {
    const onClose = jest.fn();
    renderDrawer({ onClose });

    fireEvent.click(screen.getByTestId('benchmark-catalog-category-filter'));
    const categorySearch = screen.getByRole('textbox', { name: 'Search category' });
    fireEvent.change(categorySearch, { target: { value: 'general' } });
    fireEvent.keyDown(categorySearch, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('copy-suite-add-benchmarks-catalog-drawer')).toBeInTheDocument();
  });
});
