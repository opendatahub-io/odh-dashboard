/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { Drawer, DrawerContent } from '@patternfly/react-core';
import CollectionDrawerPanel, {
  BenchmarkWithProvider,
} from '~/app/components/CollectionDrawerPanel';
import { Collection } from '~/app/types';
import { trackEvalHubEvent } from '~/app/tracking/evalhubTracking';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';

jest.mock('~/app/tracking/evalhubTracking', () => ({
  trackEvalHubEvent: jest.fn(),
}));

const mockTrackEvalHubEvent = jest.mocked(trackEvalHubEvent);

jest.mock('~/app/components/benchmarkUtils', () => ({
  getCategoryColor: () => 'blue',
  capitalizeFirst: (s: string) => s.charAt(0).toUpperCase() + s.slice(1),
  formatCollectionMetadataValue: (s: string) => s,
  getMetricDisplayName: (m: string) => m,
  toSafeExternalUrl: (url?: string) => url,
  VISIBLE_METRICS_COUNT: 3,
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('~/app/utilities/benchmarkDatasetUrls', () => ({
  getBenchmarkDatasetUrl: jest.fn(),
}));

const makeCollection = (
  overrides: Partial<Collection> & { resource: Collection['resource'] },
): Collection => ({
  name: 'Test Collection',
  benchmarks: [],
  ...overrides,
});

const makeBenchmark = (
  id: string,
  providerId: string,
  metrics: string[] = [],
): BenchmarkWithProvider => ({
  id,
  providerName: providerId,
  name: id,
  metrics,
});

type RenderPanelProps = {
  collection: Collection | undefined;
  benchmarkDetailsMap: Map<string, BenchmarkWithProvider>;
};

const renderPanel = ({ collection, benchmarkDetailsMap }: RenderPanelProps) => {
  const onClose = jest.fn();
  const onRunCollection = jest.fn();

  const panel = (
    <CollectionDrawerPanel
      collection={collection}
      benchmarkDetailsMap={benchmarkDetailsMap}
      onClose={onClose}
      onRunCollection={onRunCollection}
    />
  );

  return render(
    <Drawer isExpanded>
      <DrawerContent panelContent={panel}>
        <div />
      </DrawerContent>
    </Drawer>,
  );
};

describe('CollectionDrawerPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should identify system collections and expose the customize action', () => {
    const collection = makeCollection({ resource: { id: 'system-suite' } });
    const onRunCollection = jest.fn();
    const onCustomizeCollection = jest.fn();

    render(
      <Drawer isExpanded>
        <DrawerContent
          panelContent={
            <CollectionDrawerPanel
              collection={collection}
              benchmarkDetailsMap={new Map()}
              onClose={jest.fn()}
              onRunCollection={onRunCollection}
              onCustomizeCollection={onCustomizeCollection}
              isSystemCollection
            />
          }
        >
          <div />
        </DrawerContent>
      </Drawer>,
    );

    fireEvent.click(screen.getByTestId('use-benchmark-suite-button'));
    fireEvent.click(screen.getByTestId('customize-benchmark-suite-button'));

    expect(onRunCollection).toHaveBeenCalledWith(collection, true);
    expect(onCustomizeCollection).toHaveBeenCalledWith(collection);
    expect(mockTrackEvalHubEvent).toHaveBeenCalledWith(
      EVAL_HUB_EVENTS.BENCHMARK_RUN_SELECTED,
      {
        runType: 'collection',
        collectionName: 'Test Collection',
        benchmarkTypes: '[]',
        countOfBenchmarks: 0,
      },
      {
        collectionType: 'custom',
        providerType: undefined,
      },
    );
  });

  it('should show prerequisites, metadata sections, and customize only for mapped collections', () => {
    const collection = makeCollection({
      resource: { id: 'tool-use-v1' },
      modalities: ['vision', 'text'],
      tasks: ['z-task', 'a-task'],
      tags: ['zeta', 'alpha'],
      benchmarks: [
        { id: 'bench-z', provider_id: 'prov' },
        { id: 'bench-a', provider_id: 'prov' },
      ],
    });
    const detailsMap = new Map<string, BenchmarkWithProvider>([
      [
        'prov:bench-z',
        { ...makeBenchmark('bench-z', 'prov', ['z_metric']), name: 'Zulu benchmark' },
      ],
      [
        'prov:bench-a',
        { ...makeBenchmark('bench-a', 'prov', ['accuracy']), name: 'Alpha benchmark' },
      ],
    ]);
    const onRunCollection = jest.fn();
    const onCustomizeCollection = jest.fn();

    render(
      <Drawer isExpanded>
        <DrawerContent
          panelContent={
            <CollectionDrawerPanel
              collection={collection}
              benchmarkDetailsMap={detailsMap}
              onClose={jest.fn()}
              onRunCollection={onRunCollection}
              onCustomizeCollection={onCustomizeCollection}
              isSystemCollection
            />
          }
        >
          <div />
        </DrawerContent>
      </Drawer>,
    );

    expect(screen.getByTestId('collection-drawer-prerequisite')).toHaveTextContent(
      'The model you are evaluating must support multiple tool/function calls.',
    );
    expect(screen.getByTestId('collection-drawer-prerequisite')).toHaveClass('pf-m-info');
    expect(screen.getByTestId('collection-drawer-prerequisite')).not.toHaveClass('pf-m-warning');
    expect(screen.queryByTestId('use-benchmark-suite-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('customize-benchmark-suite-button')).toBeInTheDocument();
    expect(screen.getByTestId('collection-drawer-metrics-section')).toBeInTheDocument();
    expect(screen.getByTestId('collection-drawer-modalities-section')).toBeInTheDocument();
    expect(screen.getByTestId('collection-drawer-tasks-section')).toBeInTheDocument();
    expect(screen.getByTestId('collection-drawer-tags-section')).toBeInTheDocument();
    expect(screen.getByTestId('collection-drawer-benchmarks-section')).toBeInTheDocument();
    const getLabelTexts = (testId: string) =>
      within(screen.getByTestId(testId))
        .getAllByRole('listitem')
        .map((item) => item.textContent);

    expect(getLabelTexts('collection-drawer-metrics-labels')).toEqual(['accuracy', 'z_metric']);
    expect(getLabelTexts('collection-drawer-modalities-labels')).toEqual(['text', 'vision']);
    expect(getLabelTexts('collection-drawer-tasks-labels')).toEqual(['a-task', 'z-task']);
    expect(getLabelTexts('collection-drawer-tags-labels')).toEqual(['alpha', 'zeta']);
    const benchmarksSection = screen.getByTestId('collection-drawer-benchmarks-section');
    expect(
      within(benchmarksSection)
        .getByText('Alpha benchmark')
        .compareDocumentPosition(within(benchmarksSection).getByText('Zulu benchmark')),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByTestId('benchmark-metric-filter')).toHaveAttribute('aria-label', 'Metrics');
    expect(screen.getByTestId('benchmark-metric-filter').querySelector('svg')).toBeInTheDocument();
    const metricsSection = screen.getByTestId('collection-drawer-metrics-section');
    expect(within(metricsSection).getByText('Metrics evaluated')).toHaveClass(
      'pf-v6-u-text-color-regular',
      'pf-v6-u-font-size-md',
      'pf-v6-u-font-weight-bold',
    );

    fireEvent.click(within(metricsSection).getByRole('button', { name: 'Metrics evaluated' }));
    expect(
      within(metricsSection).getByRole('button', { name: 'Metrics evaluated' }),
    ).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Benchmarks' }));
    expect(screen.getByRole('button', { name: 'Benchmarks' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    fireEvent.click(screen.getByTestId('customize-benchmark-suite-button'));
    expect(onCustomizeCollection).toHaveBeenCalledWith(collection);
    expect(onRunCollection).not.toHaveBeenCalled();
  });

  it('should keep tenant collections on the run flow when their ID matches a prerequisite', () => {
    const collection = makeCollection({
      resource: { id: 'tool-use-v1', tenant: 'test-tenant' },
    });
    const onRunCollection = jest.fn();
    const onCustomizeCollection = jest.fn();

    render(
      <Drawer isExpanded>
        <DrawerContent
          panelContent={
            <CollectionDrawerPanel
              collection={collection}
              benchmarkDetailsMap={new Map()}
              onClose={jest.fn()}
              onRunCollection={onRunCollection}
              onCustomizeCollection={onCustomizeCollection}
            />
          }
        >
          <div />
        </DrawerContent>
      </Drawer>,
    );

    expect(screen.queryByTestId('collection-drawer-prerequisite')).not.toBeInTheDocument();
    expect(screen.getByTestId('use-benchmark-suite-button')).toBeInTheDocument();
    expect(screen.queryByTestId('customize-benchmark-suite-button')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('use-benchmark-suite-button'));
    expect(onRunCollection).toHaveBeenCalledWith(collection, false);
    expect(onCustomizeCollection).not.toHaveBeenCalled();
  });

  it('should retain the run action for unmapped collections', () => {
    const collection = makeCollection({ resource: { id: 'unmapped-suite' } });
    const onRunCollection = jest.fn();

    render(
      <Drawer isExpanded>
        <DrawerContent
          panelContent={
            <CollectionDrawerPanel
              collection={collection}
              benchmarkDetailsMap={new Map()}
              onClose={jest.fn()}
              onRunCollection={onRunCollection}
            />
          }
        >
          <div />
        </DrawerContent>
      </Drawer>,
    );

    fireEvent.click(screen.getByTestId('use-benchmark-suite-button'));
    expect(onRunCollection).toHaveBeenCalledWith(collection, false);
    expect(screen.queryByTestId('customize-benchmark-suite-button')).not.toBeInTheDocument();
  });

  it('should reset search and metric filter when collection changes', () => {
    const detailsMap = new Map<string, BenchmarkWithProvider>([
      ['prov:bench-a', makeBenchmark('bench-a', 'prov', ['accuracy'])],
      ['prov:bench-b', makeBenchmark('bench-b', 'prov', ['accuracy'])],
      ['prov:bench-c', makeBenchmark('bench-c', 'prov', ['f1'])],
    ]);

    const collectionA = makeCollection({
      resource: { id: 'col-1' },
      name: 'Collection A',
      benchmarks: [
        { id: 'bench-a', provider_id: 'prov' },
        { id: 'bench-b', provider_id: 'prov' },
      ],
    });

    const collectionB = makeCollection({
      resource: { id: 'col-2' },
      name: 'Collection B',
      benchmarks: [{ id: 'bench-c', provider_id: 'prov' }],
    });

    const { rerender } = renderPanel({ collection: collectionA, benchmarkDetailsMap: detailsMap });

    const searchInput = screen.getByTestId('benchmark-search-input');
    fireEvent.change(searchInput.querySelector('input')!, { target: { value: 'bench-a' } });
    expect(searchInput.querySelector('input')).toHaveValue('bench-a');

    rerender(
      <Drawer isExpanded>
        <DrawerContent
          panelContent={
            <CollectionDrawerPanel
              collection={collectionB}
              benchmarkDetailsMap={detailsMap}
              onClose={jest.fn()}
              onRunCollection={jest.fn()}
            />
          }
        >
          <div />
        </DrawerContent>
      </Drawer>,
    );

    expect(screen.getByTestId('benchmark-search-input').querySelector('input')).toHaveValue('');
  });

  it('should preserve search when the same collection remains open', () => {
    const detailsMap = new Map<string, BenchmarkWithProvider>([
      ['prov:bench-a', makeBenchmark('bench-a', 'prov', ['accuracy'])],
    ]);

    const collection = makeCollection({
      resource: { id: 'col-1' },
      name: 'Collection A',
      benchmarks: [{ id: 'bench-a', provider_id: 'prov' }],
    });

    const { rerender } = renderPanel({ collection, benchmarkDetailsMap: detailsMap });

    const searchInput = screen.getByTestId('benchmark-search-input');
    fireEvent.change(searchInput.querySelector('input')!, { target: { value: 'bench' } });
    expect(searchInput.querySelector('input')).toHaveValue('bench');

    rerender(
      <Drawer isExpanded>
        <DrawerContent
          panelContent={
            <CollectionDrawerPanel
              collection={{ ...collection }}
              benchmarkDetailsMap={detailsMap}
              onClose={jest.fn()}
              onRunCollection={jest.fn()}
            />
          }
        >
          <div />
        </DrawerContent>
      </Drawer>,
    );

    expect(screen.getByTestId('benchmark-search-input').querySelector('input')).toHaveValue(
      'bench',
    );
  });

  it('should reset search when collection is closed and a different one is opened', () => {
    const detailsMap = new Map<string, BenchmarkWithProvider>([
      ['prov:bench-a', makeBenchmark('bench-a', 'prov', ['accuracy'])],
      ['prov:bench-b', makeBenchmark('bench-b', 'prov', ['f1'])],
    ]);

    const collectionA = makeCollection({
      resource: { id: 'col-1' },
      name: 'Collection A',
      benchmarks: [{ id: 'bench-a', provider_id: 'prov' }],
    });

    const collectionB = makeCollection({
      resource: { id: 'col-2' },
      name: 'Collection B',
      benchmarks: [{ id: 'bench-b', provider_id: 'prov' }],
    });

    const { rerender } = renderPanel({ collection: collectionA, benchmarkDetailsMap: detailsMap });

    const searchInput = screen.getByTestId('benchmark-search-input');
    fireEvent.change(searchInput.querySelector('input')!, { target: { value: 'bench-a' } });
    expect(searchInput.querySelector('input')).toHaveValue('bench-a');

    // Close the drawer (collection becomes undefined)
    rerender(
      <Drawer isExpanded>
        <DrawerContent
          panelContent={
            <CollectionDrawerPanel
              collection={undefined}
              benchmarkDetailsMap={detailsMap}
              onClose={jest.fn()}
              onRunCollection={jest.fn()}
            />
          }
        >
          <div />
        </DrawerContent>
      </Drawer>,
    );

    // Open a different collection
    rerender(
      <Drawer isExpanded>
        <DrawerContent
          panelContent={
            <CollectionDrawerPanel
              collection={collectionB}
              benchmarkDetailsMap={detailsMap}
              onClose={jest.fn()}
              onRunCollection={jest.fn()}
            />
          }
        >
          <div />
        </DrawerContent>
      </Drawer>,
    );

    expect(screen.getByTestId('benchmark-search-input').querySelector('input')).toHaveValue('');
  });

  it('should display collection benchmark overrides over provider defaults', () => {
    const detailsMap = new Map<string, BenchmarkWithProvider>([
      [
        'lm_evaluation_harness:toxigen',
        {
          ...makeBenchmark('toxigen', 'lm_evaluation_harness'),
          pass_criteria: { threshold: 0.3 },
          primary_score: { metric: 'provider_metric', lower_is_better: false },
          url: 'https://provider.example.com/toxigen',
        },
      ],
    ]);

    const collection = makeCollection({
      resource: { id: 'safety-suite' },
      name: 'Safety Suite',
      benchmarks: [
        {
          id: 'toxigen',
          provider_id: 'lm_evaluation_harness',
          pass_criteria: { threshold: 0.85 },
          primary_score: { metric: 'collection_metric', lower_is_better: false },
          url: 'https://collection.example.com/toxigen',
        },
      ],
    });

    renderPanel({ collection, benchmarkDetailsMap: detailsMap });

    fireEvent.click(screen.getByRole('button', { name: /^Expand/ }));

    expect(screen.getByText('0.85')).toBeInTheDocument();
    expect(screen.queryByText('30%')).not.toBeInTheDocument();
    expect(screen.getByText('collection_metric')).toBeInTheDocument();
    expect(screen.queryByText('provider_metric')).not.toBeInTheDocument();

    const datasetLink = screen.getByRole('link', { name: /View benchmark dataset/i });
    expect(datasetLink).toHaveAttribute('href', 'https://collection.example.com/toxigen');
  });

  it('should fall back to provider defaults when collection benchmark has no overrides', () => {
    const detailsMap = new Map<string, BenchmarkWithProvider>([
      [
        'lm_evaluation_harness:toxigen',
        {
          ...makeBenchmark('toxigen', 'lm_evaluation_harness'),
          pass_criteria: { threshold: 0.3 },
          primary_score: { metric: 'provider_metric', lower_is_better: false },
          url: 'https://provider.example.com/toxigen',
        },
      ],
    ]);

    const collection = makeCollection({
      resource: { id: 'safety-suite' },
      name: 'Safety Suite',
      benchmarks: [{ id: 'toxigen', provider_id: 'lm_evaluation_harness' }],
    });

    renderPanel({ collection, benchmarkDetailsMap: detailsMap });

    fireEvent.click(screen.getByRole('button', { name: /^Expand/ }));

    expect(screen.getByText('0.3')).toBeInTheDocument();
    expect(screen.getByText('provider_metric')).toBeInTheDocument();

    const datasetLink = screen.getByRole('link', { name: /View benchmark dataset/i });
    expect(datasetLink).toHaveAttribute('href', 'https://provider.example.com/toxigen');
  });

  it('should render a benchmark test_data_ref definition inside its card', () => {
    const detailsMap = new Map<string, BenchmarkWithProvider>([
      ['lm_evaluation_harness:toxigen', makeBenchmark('toxigen', 'lm_evaluation_harness')],
    ]);

    const collection = makeCollection({
      resource: { id: 'safety-suite' },
      name: 'Safety Suite',
      benchmarks: [
        {
          id: 'toxigen',
          provider_id: 'lm_evaluation_harness',
          test_data_ref: {
            git: {
              url: 'https://example.com/data.git',
              ref: 'main',
              secret_ref: 'git-auth',
            },
          },
        },
      ],
    });

    renderPanel({ collection, benchmarkDetailsMap: detailsMap });

    expect(screen.queryByText('Test data')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Expand/ }));

    const testDataSection = screen.getByTestId('benchmark-test-data-ref');
    expect(within(testDataSection).getByText('Git repository')).toBeInTheDocument();
    expect(within(testDataSection).getByText('https://example.com/data.git')).toBeInTheDocument();
    expect(within(testDataSection).getByText('main')).toBeInTheDocument();
    expect(within(testDataSection).getByText('git-auth')).toBeInTheDocument();
  });
});
