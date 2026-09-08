import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { mockCollection } from '~/__mocks__/mockCollection';
import BenchmarkSuiteCard from '~/app/components/BenchmarkSuiteCard';

describe('BenchmarkSuiteCard', () => {
  it('should render collection metadata and metrics', () => {
    const collection = mockCollection({
      id: 'model-suite',
      name: 'Model suite',
      domains: ['safety', 'model'],
      benchmarkIds: ['benchmark-1', 'benchmark-2'],
      benchmarkMetrics: ['mc1_acc', 'toxicity_score'],
    });

    render(
      <BenchmarkSuiteCard
        collection={collection}
        primaryAction={{ label: 'Run benchmark suite', onClick: jest.fn() }}
        contextualActions={[{ id: 'delete', label: 'Delete', onSelect: jest.fn() }]}
      />,
    );

    expect(screen.getByTestId('benchmark-suite-card-model-suite')).toHaveTextContent('Model suite');
    expect(screen.getByText('2 benchmarks')).toBeInTheDocument();
    expect(screen.getByText('Safety')).toBeInTheDocument();
    expect(screen.getByText('Model')).toBeInTheDocument();
    expect(screen.getByText('MC1 accuracy')).toBeInTheDocument();
    expect(screen.getByText('Toxicity score')).toBeInTheDocument();
  });

  it('should render and invoke contextual actions for the collection', () => {
    const collection = mockCollection({ id: 'model-suite' });
    const onSelect = jest.fn();

    render(
      <BenchmarkSuiteCard
        collection={collection}
        primaryAction={{ label: 'Run benchmark suite', onClick: jest.fn() }}
        contextualActions={[
          { id: 'edit', label: 'Edit', onSelect },
          { id: 'duplicate', label: 'Duplicate', onSelect },
          { id: 'delete', label: 'Delete', onSelect, isDanger: true },
        ]}
      />,
    );

    fireEvent.click(screen.getByTestId('benchmark-suite-card-menu-model-suite'));

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

    expect(onSelect).toHaveBeenCalledWith(collection);
  });

  it('should call the primary action when clicked', () => {
    const onClick = jest.fn();
    render(
      <BenchmarkSuiteCard
        collection={mockCollection({ id: 'model-suite' })}
        primaryAction={{ label: 'Run benchmark suite', onClick }}
      />,
    );

    fireEvent.click(screen.getByTestId('benchmark-suite-card-primary-action-model-suite'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should invoke the suite selection callback when the name is clicked', () => {
    const collection = mockCollection({ id: 'model-suite' });
    const onSelect = jest.fn();

    render(
      <BenchmarkSuiteCard
        collection={collection}
        primaryAction={{ label: 'Run benchmark suite', onClick: jest.fn() }}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByTestId('benchmark-suite-card-name-model-suite'));

    expect(onSelect).toHaveBeenCalledWith(collection);
  });

  it('should use the legacy category when domains are not available', () => {
    render(
      <BenchmarkSuiteCard
        collection={mockCollection({ id: 'legacy-suite', category: 'legacy_category' })}
        primaryAction={{ label: 'Run benchmark suite', onClick: jest.fn() }}
      />,
    );

    expect(screen.getByText('Legacy category')).toBeInTheDocument();
  });
});
