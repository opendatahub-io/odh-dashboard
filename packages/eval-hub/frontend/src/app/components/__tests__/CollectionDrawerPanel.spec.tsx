/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Drawer, DrawerContent } from '@patternfly/react-core';
import CollectionDrawerPanel, {
  BenchmarkWithProvider,
} from '~/app/components/CollectionDrawerPanel';
import { Collection } from '~/app/types';

jest.mock('~/app/components/benchmarkUtils', () => ({
  getCategoryColor: () => 'blue',
  capitalizeFirst: (s: string) => s.charAt(0).toUpperCase() + s.slice(1),
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
});
