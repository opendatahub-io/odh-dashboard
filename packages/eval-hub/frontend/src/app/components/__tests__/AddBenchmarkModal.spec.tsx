/* eslint-disable camelcase */
import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
        metrics: ['accuracy', 'f1'],
        primary_score: { metric: 'accuracy', lower_is_better: false },
        pass_criteria: { threshold: 0.8 },
        dataset_size: 1000,
        num_few_shot: 4,
      },
      {
        id: 'truthfulqa',
        name: 'TruthfulQA',
        metrics: ['accuracy'],
        dataset_size: 500,
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

describe('AddBenchmarkModal', () => {
  it('should list available provider benchmarks and exclude existing benchmarks', () => {
    renderModal({ existingBenchmarkIds: new Set(['provider-one:truthfulqa']) });

    expect(screen.getByText('ARC Easy')).toBeInTheDocument();
    expect(screen.getByText('Provider One Display Name · arc_easy')).toBeInTheDocument();
    expect(screen.queryByText('TruthfulQA')).not.toBeInTheDocument();
    expect(screen.getByTestId('add-benchmark-confirm')).toBeDisabled();
  });

  it('should filter benchmarks by name, id, or provider', () => {
    renderModal();
    const filter = screen.getByRole('textbox', { name: 'Filter benchmarks' });

    fireEvent.change(filter, { target: { value: 'truth' } });

    expect(screen.getByText('TruthfulQA')).toBeInTheDocument();
    expect(screen.queryByText('ARC Easy')).not.toBeInTheDocument();

    fireEvent.change(filter, { target: { value: 'does-not-exist' } });
    expect(screen.getByTestId('no-available-benchmarks')).toHaveTextContent(
      'No benchmarks match the current filter.',
    );
  });

  it('should add selected benchmarks with their provider configuration', () => {
    const onAdd = jest.fn();
    renderModal({ onAdd });

    fireEvent.click(screen.getByTestId('add-benchmark-checkbox-arc_easy'));
    expect(screen.getByTestId('add-benchmark-confirm')).toHaveTextContent('Add selected (1)');

    fireEvent.click(screen.getByTestId('add-benchmark-confirm'));

    expect(onAdd).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'arc_easy',
        providerId: 'provider-one',
        name: 'ARC Easy',
        weight: 1,
        primaryMetric: 'accuracy',
        numSamples: 1000,
        datasetSize: 1000,
        randomSeed: 4,
        threshold: 80,
        availableMetrics: ['accuracy', 'f1'],
      }),
    ]);
  });

  it('should support selecting multiple benchmarks', () => {
    const onAdd = jest.fn();
    renderModal({ onAdd });

    fireEvent.click(screen.getByTestId('add-benchmark-checkbox-arc_easy'));
    fireEvent.click(screen.getByTestId('add-benchmark-checkbox-truthfulqa'));
    fireEvent.click(screen.getByTestId('add-benchmark-confirm'));

    expect(onAdd).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'arc_easy' }),
        expect.objectContaining({ id: 'truthfulqa' }),
      ]),
    );
  });

  it('should enforce the maximum number of new benchmarks', () => {
    renderModal({ maxNewBenchmarks: 1 });

    fireEvent.click(screen.getByTestId('add-benchmark-checkbox-arc_easy'));

    expect(screen.getByTestId('add-benchmark-limit-warning')).toHaveTextContent(
      'You can only add 1 more benchmark',
    );
    expect(screen.getByTestId('add-benchmark-checkbox-truthfulqa')).toBeDisabled();
  });

  it('should close without adding when cancelled', () => {
    const onAdd = jest.fn();
    const onClose = jest.fn();
    renderModal({ onAdd, onClose });

    fireEvent.click(screen.getByTestId('add-benchmark-cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAdd).not.toHaveBeenCalled();
  });
});
