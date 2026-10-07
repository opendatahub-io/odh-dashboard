/* eslint-disable camelcase */
import * as React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { mockCollection } from '~/__mocks__/mockCollection';
import BenchmarkSuiteCard from '~/app/components/BenchmarkSuiteCard';

describe('BenchmarkSuiteCard', () => {
  it('should render collection metadata and metrics', () => {
    const collection = mockCollection({
      id: 'model-suite',
      name: 'Model suite',
      domains: ['safety'],
      benchmarkIds: ['benchmark-2', 'benchmark-1'],
      benchmarkMetrics: ['toxicity_score', 'mc1_acc'],
    });
    collection.evaluation_targets = ['model', 'agent'];

    render(
      <BenchmarkSuiteCard
        collection={collection}
        primaryAction={{ label: 'Run', onClick: jest.fn() }}
        contextualActions={[{ id: 'delete', label: 'Delete', onSelect: jest.fn() }]}
      />,
    );

    expect(screen.getByTestId('benchmark-suite-card-model-suite')).toHaveTextContent('Model suite');
    expect(screen.queryByText('2 benchmarks')).not.toBeInTheDocument();
    expect(screen.getByText('Safety')).toBeInTheDocument();
    expect(screen.queryByText('Model')).not.toBeInTheDocument();
    expect(screen.queryByText('MC1 accuracy')).not.toBeInTheDocument();
    expect(screen.queryByText('Toxicity score')).not.toBeInTheDocument();
    expect(screen.getByTestId('benchmark-suite-card-benchmarks-model-suite')).toHaveTextContent(
      '2',
    );
    expect(screen.getByTestId('benchmark-suite-card-metrics-model-suite')).toHaveTextContent('2');
    expect(screen.getByTestId('benchmark-suite-card-metrics-model-suite')).toHaveAttribute(
      'aria-label',
      'Metrics: MC1 accuracy, Toxicity score',
    );
    expect(
      screen.getByTestId('benchmark-suite-card-evaluation-targets-model-suite'),
    ).toHaveTextContent('2');
    expect(
      screen.getByTestId('benchmark-suite-card-evaluation-targets-model-suite'),
    ).toHaveAttribute('aria-label', 'Evaluation targets: Agent, Model');
    expect(screen.getByTestId('benchmark-suite-card-benchmarks-model-suite')).toHaveAttribute(
      'aria-label',
      'Benchmarks: benchmark-1, benchmark-2',
    );
    const categoryTag = screen.getByText('Safety');
    const metricsSummary = screen.getByTestId('benchmark-suite-card-metrics-model-suite');
    expect(categoryTag.compareDocumentPosition(metricsSummary)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('should show an italic fallback when the collection has no description', () => {
    render(
      <BenchmarkSuiteCard
        collection={{ ...mockCollection({ id: 'no-description-suite' }), description: undefined }}
        primaryAction={{ label: 'Run', onClick: jest.fn() }}
      />,
    );

    const fallbackDescription = screen.getByText('No description provided');
    expect(fallbackDescription).toBeInTheDocument();
    expect(fallbackDescription.tagName).toBe('EM');
  });

  it('should show benchmark names and fall back to IDs in the benchmark count tooltip', async () => {
    render(
      <BenchmarkSuiteCard
        collection={mockCollection({
          id: 'benchmark-tooltip-suite',
          benchmarkIds: ['benchmark-two', 'benchmark-one'],
        })}
        benchmarkNameMap={new Map([['safety_eval_suite:benchmark-one', 'Benchmark One']])}
        primaryAction={{ label: 'Run', onClick: jest.fn() }}
      />,
    );

    fireEvent.mouseEnter(
      screen.getByTestId('benchmark-suite-card-benchmarks-benchmark-tooltip-suite'),
    );

    expect(await screen.findByText('Benchmark One')).toBeInTheDocument();
    expect(screen.getByText('benchmark-two')).toBeInTheDocument();
    expect(
      screen.getByText('Benchmark One').compareDocumentPosition(screen.getByText('benchmark-two')),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      screen.getByTestId('benchmark-suite-card-benchmarks-benchmark-tooltip-suite'),
    ).toHaveAttribute('aria-label', 'Benchmarks: Benchmark One, benchmark-two');
  });

  it('should show evaluation targets in the evaluation target count tooltip', async () => {
    render(
      <BenchmarkSuiteCard
        collection={{
          ...mockCollection({ id: 'evaluation-targets-tooltip-suite' }),
          evaluation_targets: ['model', 'agent'],
        }}
        primaryAction={{ label: 'Run', onClick: jest.fn() }}
      />,
    );

    fireEvent.mouseEnter(
      screen.getByTestId(
        'benchmark-suite-card-evaluation-targets-evaluation-targets-tooltip-suite',
      ),
    );

    expect(await screen.findByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('Model')).toBeInTheDocument();
  });

  it('should show the successful run count when enabled', async () => {
    render(
      <BenchmarkSuiteCard
        collection={{ ...mockCollection({ id: 'run-count-suite' }), state: { run_count: 3 } }}
        primaryAction={{ label: 'Run', onClick: jest.fn() }}
        showRunCount
      />,
    );

    const runCount = screen.getByTestId('benchmark-suite-card-run-count-run-count-suite');
    expect(runCount).toHaveTextContent('3');
    expect(runCount).toHaveAttribute(
      'aria-label',
      'Run Count: Number of successful executions of this suite',
    );

    fireEvent.mouseEnter(runCount);
    expect(
      await screen.findByText('Run Count: Number of successful executions of this suite'),
    ).toBeInTheDocument();
  });

  it('should hide the successful run count when disabled', () => {
    render(
      <BenchmarkSuiteCard
        collection={{
          ...mockCollection({ id: 'hidden-run-count-suite' }),
          state: { run_count: 3 },
        }}
        primaryAction={{ label: 'Run', onClick: jest.fn() }}
      />,
    );

    expect(
      screen.queryByTestId('benchmark-suite-card-run-count-hidden-run-count-suite'),
    ).not.toBeInTheDocument();
  });

  it.each([1, 2, 3])('should mark curation order %s as recommended', (curationOrder) => {
    render(
      <BenchmarkSuiteCard
        collection={{
          ...mockCollection({ id: `popular-suite-${curationOrder}` }),
          curation_order: curationOrder,
        }}
        primaryAction={{ label: 'Run', onClick: jest.fn() }}
      />,
    );

    const label = screen.getByTestId(`benchmark-suite-card-popular-popular-suite-${curationOrder}`);
    expect(label).toHaveTextContent('Recommended');
    expect(label).toHaveClass('pf-m-teal', 'pf-m-outline');
    expect(label.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('should not mark later curated suites as popular', () => {
    render(
      <BenchmarkSuiteCard
        collection={{ ...mockCollection({ id: 'not-popular-suite' }), curation_order: 4 }}
        primaryAction={{ label: 'Run', onClick: jest.fn() }}
      />,
    );

    expect(
      screen.queryByTestId('benchmark-suite-card-popular-not-popular-suite'),
    ).not.toBeInTheDocument();
  });

  it('should reserve the popular label space when requested', () => {
    render(
      <BenchmarkSuiteCard
        collection={{
          ...mockCollection({ id: 'reserved-popular-space-suite' }),
          curation_order: 4,
        }}
        primaryAction={{ label: 'Run', onClick: jest.fn() }}
        reservePopularHeader
      />,
    );

    const label = screen.getByTestId(
      'benchmark-suite-card-popular-placeholder-reserved-popular-space-suite',
    );
    expect(label).toHaveTextContent('Recommended');
    expect(label).toHaveClass('pf-m-teal', 'pf-m-outline');
    expect(label.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(
      screen.queryByTestId('benchmark-suite-card-popular-reserved-popular-space-suite'),
    ).not.toBeInTheDocument();
  });

  it('should render and invoke contextual actions for the collection', () => {
    const collection = mockCollection({ id: 'model-suite' });
    const onSelect = jest.fn();

    render(
      <BenchmarkSuiteCard
        collection={collection}
        primaryAction={{ label: 'Run', onClick: jest.fn() }}
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

  it('should disable edit when the collection has existing runs', () => {
    const onEdit = jest.fn();
    const collection = {
      ...mockCollection({ id: 'run-suite' }),
      state: { run_count: 1 },
    };

    render(
      <BenchmarkSuiteCard
        collection={collection}
        primaryAction={{ label: 'Run', onClick: jest.fn() }}
        contextualActions={[{ id: 'edit', label: 'Edit', onSelect: onEdit, isDisabled: true }]}
      />,
    );

    fireEvent.click(screen.getByTestId('benchmark-suite-card-menu-run-suite'));
    const editAction = screen.getByRole('menuitem', { name: 'Edit' });

    expect(editAction).toBeDisabled();
    fireEvent.click(editAction);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('should call the primary action when clicked', () => {
    const onClick = jest.fn();
    render(
      <BenchmarkSuiteCard
        collection={mockCollection({ id: 'model-suite' })}
        primaryAction={{ label: 'Run', onClick }}
      />,
    );

    fireEvent.click(screen.getByTestId('benchmark-suite-card-primary-action-model-suite'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should render Run as the split button action and Customize in its menu', () => {
    const onRun = jest.fn();
    const onCustomize = jest.fn();

    render(
      <BenchmarkSuiteCard
        collection={mockCollection({ id: 'curated-suite' })}
        primaryAction={{ label: 'Run', onClick: onRun, variant: 'secondary' }}
        dropdownAction={{ label: 'Customize', onClick: onCustomize }}
      />,
    );

    const runButton = screen.getByTestId('benchmark-suite-card-primary-action-curated-suite');
    const dropdownToggle = screen.getByTestId('benchmark-suite-card-dropdown-toggle-curated-suite');
    const splitButton = dropdownToggle.closest('.pf-v6-c-menu-toggle');

    expect(runButton).toHaveTextContent('Run');
    expect(runButton).toHaveClass('pf-v6-c-menu-toggle__button');
    expect(splitButton).toHaveClass('pf-m-secondary');
    expect(
      screen.queryByTestId('benchmark-suite-card-dropdown-action-curated-suite'),
    ).not.toBeInTheDocument();

    fireEvent.click(runButton);
    fireEvent.click(dropdownToggle);
    const customizeAction = screen.getByTestId(
      'benchmark-suite-card-dropdown-action-curated-suite',
    );
    fireEvent.click(within(customizeAction).getByRole('menuitem'));

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onCustomize).toHaveBeenCalledTimes(1);
  });

  it('should invoke the suite selection callback when the name is clicked', () => {
    const collection = mockCollection({ id: 'model-suite' });
    const onSelect = jest.fn();

    render(
      <BenchmarkSuiteCard
        collection={collection}
        primaryAction={{ label: 'Run', onClick: jest.fn() }}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByTestId('benchmark-suite-card-name-model-suite'));

    expect(onSelect).toHaveBeenCalledWith(collection);
  });

  it('should render tags from the tags field instead of domains or evaluation targets', () => {
    render(
      <BenchmarkSuiteCard
        collection={{
          ...mockCollection({
            id: 'collection-tags-suite',
            domains: ['domain_value'],
            tags: ['collection_tag'],
          }),
          category: 'primary_category',
          evaluation_targets: ['model'],
        }}
        primaryAction={{ label: 'Run', onClick: jest.fn() }}
      />,
    );

    expect(screen.getByText('Collection tag')).toBeInTheDocument();
    expect(screen.getByText('Collection tag').closest('.pf-v6-c-label')).toHaveClass(
      'pf-m-outline',
    );
    expect(screen.queryByText('Domain value')).not.toBeInTheDocument();
    expect(screen.queryByText('Primary category')).not.toBeInTheDocument();
    expect(screen.queryByText('Model')).not.toBeInTheDocument();
  });

  it('should render tags in alphabetical order', () => {
    render(
      <BenchmarkSuiteCard
        collection={mockCollection({
          id: 'alphabetized-tags-suite',
          tags: ['zebra', 'alpha', 'middle'],
        })}
        primaryAction={{ label: 'Run', onClick: jest.fn() }}
      />,
    );

    expect(screen.getByText('Alpha').compareDocumentPosition(screen.getByText('Middle'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByText('Middle').compareDocumentPosition(screen.getByText('Zebra'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it.each([
    ['knowledge_and_reasoning', 'purple'],
    ['grounded_document_understanding', 'blue'],
    ['instruction_and_output_reliability', 'green'],
    ['tool_use_and_function_calling', 'yellow'],
    ['software', 'orange'],
    ['trustworthiness', 'red'],
    ['multilingual', 'teal'],
    ['multimodal', 'orangered'],
  ])('should render the %s domain icon with the %s color', (domain, color) => {
    render(
      <BenchmarkSuiteCard
        collection={{
          ...mockCollection({ id: `${domain}-suite`, domains: [domain] }),
        }}
        primaryAction={{ label: 'Run', onClick: jest.fn() }}
      />,
    );

    expect(screen.getByTestId(`benchmark-suite-card-domain-icon-${domain}-suite`)).toHaveAttribute(
      'data-icon-color',
      color,
    );
  });

  it('should prefer a supported category over the first domain for the tile icon', () => {
    render(
      <BenchmarkSuiteCard
        collection={{
          ...mockCollection({
            id: 'category-icon-suite',
            domains: ['software'],
          }),
          category: 'multilingual',
        }}
        primaryAction={{ label: 'Run', onClick: jest.fn() }}
      />,
    );

    expect(
      screen.getByTestId('benchmark-suite-card-domain-icon-category-icon-suite'),
    ).toHaveAttribute('title', 'Multilingual');
  });

  it('should fall back to the first domain when category is not a supported enum value', () => {
    render(
      <BenchmarkSuiteCard
        collection={{
          ...mockCollection({
            id: 'domain-icon-fallback-suite',
            domains: ['software'],
          }),
          category: 'legacy-category',
        }}
        primaryAction={{ label: 'Run', onClick: jest.fn() }}
      />,
    );

    expect(
      screen.getByTestId('benchmark-suite-card-domain-icon-domain-icon-fallback-suite'),
    ).toHaveAttribute('title', 'Software');
  });
});

/* eslint-enable camelcase */
