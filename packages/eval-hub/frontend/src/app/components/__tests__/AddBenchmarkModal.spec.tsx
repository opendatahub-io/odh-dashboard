/* eslint-disable camelcase */
import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddBenchmarkModal from '~/app/components/AddBenchmarkModal';
import type { Provider } from '~/app/types';

const providers: Provider[] = [
  {
    resource: { id: 'provider-one' },
    name: 'Provider One',
    title: 'Provider One Display Name',
    benchmarks: [
      {
        id: 'arc_easy',
        name: 'ARC Easy',
        category: 'Reasoning',
        metrics: ['accuracy', 'f1'],
        primary_score: { metric: 'accuracy', lower_is_better: false },
        pass_criteria: { threshold: 0.8 },
        dataset_size: 1000,
        num_few_shot: 4,
      },
      {
        id: 'inspect/arc',
        name: 'ARC',
        category: 'Reasoning',
        metrics: ['accuracy'],
      },
      {
        id: 'truthfulqa',
        name: 'TruthfulQA',
        category: 'Knowledge',
        metrics: ['accuracy'],
        dataset_size: 500,
      },
      {
        id: 'zeta',
        name: 'zeta',
        category: 'Reasoning',
        metrics: ['accuracy'],
      },
      {
        id: 'capital-alpha',
        name: 'Alpha',
        category: 'Knowledge',
        metrics: ['accuracy'],
      },
      {
        id: 'alpha',
        name: 'alpha',
        category: 'Reasoning',
        metrics: ['f1'],
      },
    ],
  },
];

const renderModal = (overrides: Partial<React.ComponentProps<typeof AddBenchmarkModal>> = {}) =>
  render(
    <AddBenchmarkModal
      providers={providers}
      existingBenchmarkIds={new Set()}
      maxNewBenchmarks={10}
      onAdd={jest.fn()}
      onClose={jest.fn()}
      {...overrides}
    />,
  );

const getCheckboxIds = () => screen.getAllByRole('checkbox').map((checkbox) => checkbox.id);

describe('AddBenchmarkModal', () => {
  it('should list available provider benchmarks and exclude existing benchmarks', () => {
    renderModal({ existingBenchmarkIds: new Set(['provider-one:truthfulqa']) });

    expect(screen.getByText('ARC Easy')).toBeInTheDocument();
    expect(screen.getByText('Provider One Display Name · arc_easy')).toBeInTheDocument();
    expect(screen.queryByText('TruthfulQA')).not.toBeInTheDocument();
    expect(screen.getByTestId('add-benchmark-confirm')).toBeDisabled();
  });

  it('should render sort and filter controls', () => {
    renderModal();

    expect(screen.getByTestId('add-benchmark-sort-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('add-benchmark-sort-toggle')).toHaveTextContent('Default');
    expect(screen.getByTestId('add-benchmark-category-filter')).toBeInTheDocument();
    expect(screen.getByTestId('add-benchmark-metrics-filter')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Filter by name or ID')).toBeInTheDocument();
  });

  it('should filter benchmarks by name or ID', () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('Filter by name or ID'), {
      target: { value: 'truth' },
    });

    expect(screen.getByText('TruthfulQA')).toBeInTheDocument();
    expect(screen.queryByText('ARC Easy')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Filter by name or ID'), {
      target: { value: 'does-not-exist' },
    });
    expect(screen.getByTestId('no-available-benchmarks')).toHaveTextContent(
      'No benchmarks match the filter criteria. Try adjusting or clearing your filters.',
    );
  });

  it('should match benchmarks by partial ID', () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('Filter by name or ID'), {
      target: { value: 'inspect/' },
    });

    expect(screen.getByText('ARC')).toBeInTheDocument();
    expect(screen.queryByText('ARC Easy')).not.toBeInTheDocument();
    expect(screen.queryByText('TruthfulQA')).not.toBeInTheDocument();
  });

  it('should filter benchmarks by ID case-insensitively', () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('Filter by name or ID'), {
      target: { value: 'ARC_EASY' },
    });

    expect(screen.getByText('ARC Easy')).toBeInTheDocument();
    expect(screen.queryByText('ARC')).not.toBeInTheDocument();
    expect(screen.queryByText('TruthfulQA')).not.toBeInTheDocument();
  });

  it('should show chip label as "Name or ID" when filter is active', () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('Filter by name or ID'), {
      target: { value: 'arc' },
    });

    expect(screen.getByText('Name or ID')).toBeInTheDocument();
  });

  it('should restore all benchmarks after removing the name/ID filter chip', () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('Filter by name or ID'), {
      target: { value: 'arc_easy' },
    });

    expect(screen.queryByText('TruthfulQA')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /arc_easy/i }));

    expect(screen.getByText('ARC Easy')).toBeInTheDocument();
    expect(screen.getByText('TruthfulQA')).toBeInTheDocument();
  });

  it('should list benchmarks in provider order by default', () => {
    renderModal();

    expect(getCheckboxIds()).toEqual([
      'add-benchmark-provider-one:arc_easy',
      'add-benchmark-provider-one:inspect/arc',
      'add-benchmark-provider-one:truthfulqa',
      'add-benchmark-provider-one:zeta',
      'add-benchmark-provider-one:capital-alpha',
      'add-benchmark-provider-one:alpha',
    ]);
  });

  it('should handle benchmarks without names', () => {
    const providersWithMissingName = providers.map((provider) => ({
      ...provider,
      benchmarks: provider.benchmarks?.map((benchmark, index) => {
        if (index !== 0) {
          return benchmark;
        }
        const malformedBenchmark = { ...benchmark };
        Reflect.deleteProperty(malformedBenchmark, 'name');
        return malformedBenchmark;
      }),
    }));

    renderModal({ providers: providersWithMissingName });

    expect(screen.getByText('arc_easy')).toBeInTheDocument();
    expect(getCheckboxIds().includes('add-benchmark-provider-one:arc_easy')).toBe(true);
  });

  it('should add selected benchmarks with their provider configuration', async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn();
    renderModal({ onAdd });

    await user.click(screen.getByTestId('add-benchmark-checkbox-arc_easy'));
    expect(screen.getByTestId('add-benchmark-confirm')).toHaveTextContent('Add selected (1)');

    await user.click(screen.getByTestId('add-benchmark-confirm'));

    expect(onAdd).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'arc_easy',
        providerId: 'provider-one',
        name: 'ARC Easy',
        weight: 1,
        primaryMetric: 'accuracy',
        lowerIsBetter: false,
        numSamples: 1000,
        datasetSize: 1000,
        numFewShot: 4,
        threshold: 80,
        availableMetrics: ['accuracy', 'f1'],
      }),
    ]);
  });

  it('should support selecting multiple benchmarks', async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn();
    renderModal({ onAdd });

    await user.click(screen.getByTestId('add-benchmark-checkbox-arc_easy'));
    await user.click(screen.getByTestId('add-benchmark-checkbox-truthfulqa'));
    await user.click(screen.getByTestId('add-benchmark-confirm'));

    expect(onAdd).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'arc_easy' }),
        expect.objectContaining({ id: 'truthfulqa' }),
      ]),
    );
  });

  it('should enforce the maximum number of new benchmarks', async () => {
    const user = userEvent.setup();
    renderModal({ maxNewBenchmarks: 1 });

    await user.click(screen.getByTestId('add-benchmark-checkbox-arc_easy'));

    expect(screen.getByTestId('add-benchmark-limit-warning')).toHaveTextContent(
      'You can only add 1 more benchmark',
    );
    expect(screen.getByTestId('add-benchmark-checkbox-truthfulqa')).toBeDisabled();
  });

  it('should close without adding when cancelled', async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn();
    const onClose = jest.fn();
    renderModal({ onAdd, onClose });

    await user.click(screen.getByTestId('add-benchmark-cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('should clear all filters from the toolbar', async () => {
    const user = userEvent.setup();
    renderModal();

    fireEvent.change(screen.getByPlaceholderText('Filter by name or ID'), {
      target: { value: 'truth' },
    });
    await user.click(screen.getByTestId('add-benchmark-category-filter'));
    await user.click(screen.getByTestId('add-benchmark-category-option-Knowledge'));

    expect(screen.queryByText('ARC Easy')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));

    expect(screen.getByText('ARC Easy')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Filter by name or ID')).toHaveValue('');
  });
});
