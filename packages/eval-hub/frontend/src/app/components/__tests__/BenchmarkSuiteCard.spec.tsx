import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { mockCollection } from '~/__mocks__/mockCollection';
import BenchmarkSuiteCard from '~/app/components/BenchmarkSuiteCard';

describe('BenchmarkSuiteCard', () => {
  it('should render collection metadata and metrics', () => {
    render(
      <BenchmarkSuiteCard
        collection={mockCollection({
          id: 'model-suite',
          name: 'Model suite',
          domains: ['safety', 'model'],
          benchmarkIds: ['benchmark-1', 'benchmark-2'],
          benchmarkMetrics: ['mc1_acc', 'toxicity_score'],
        })}
        primaryAction={{ label: 'Run benchmark suite', onClick: jest.fn() }}
        contextualActions={<div>Delete</div>}
      />,
    );

    expect(screen.getByTestId('benchmark-suite-card-model-suite')).toHaveTextContent('Model suite');
    expect(screen.getByText('2 benchmarks')).toBeInTheDocument();
    expect(screen.getByText('Safety')).toBeInTheDocument();
    expect(screen.getByText('Model')).toBeInTheDocument();
    expect(screen.getByText('MC1 accuracy')).toBeInTheDocument();
    expect(screen.getByText('Toxicity score')).toBeInTheDocument();
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
