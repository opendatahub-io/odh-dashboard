import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  Content,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Label,
  SearchInput,
  Stack,
  StackItem,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { Collection, ProviderAgentMetadata, ProviderBenchmark } from '~/app/types';
import BenchmarkDrawerTileContent from './BenchmarkDrawerTileContent';
import SearchableMultiSelectFilter from './SearchableMultiSelectFilter';
import { capitalizeFirst, getCategoryColor, getMetricDisplayName } from './benchmarkUtils';

export type BenchmarkWithProvider = ProviderBenchmark & {
  providerName: string;
  providerAgent?: ProviderAgentMetadata;
};

type CollectionDrawerPanelProps = {
  collection: Collection | undefined;
  benchmarkDetailsMap: Map<string, BenchmarkWithProvider>;
  onClose: () => void;
  onRunCollection: (c: Collection) => void;
};

const CollectionDrawerPanel: React.FC<CollectionDrawerPanelProps> = ({
  collection,
  benchmarkDetailsMap,
  onClose,
  onRunCollection,
}) => {
  const [benchmarkSearch, setBenchmarkSearch] = React.useState('');
  const [metricFilter, setMetricFilter] = React.useState<string[]>([]);

  const collectionId = collection?.resource.id;
  React.useEffect(() => {
    setBenchmarkSearch('');
    setMetricFilter([]);
  }, [collectionId]);

  const availableMetrics = React.useMemo(() => {
    const metricSet = new Set<string>();
    (collection?.benchmarks ?? []).forEach((b) => {
      const key = `${b.provider_id ?? ''}:${b.id}`;
      const details = benchmarkDetailsMap.get(key);
      (details?.metrics ?? []).forEach((m) => metricSet.add(m));
    });
    return Array.from(metricSet).toSorted();
  }, [collection?.benchmarks, benchmarkDetailsMap]);

  if (!collection) {
    // DrawerPanelContent must remain in the DOM for PF's slide-in/out CSS transition to work
    return <DrawerPanelContent isResizable minSize="380px" />;
  }

  const color = getCategoryColor(collection.category);

  const filteredBenchmarks = (collection.benchmarks ?? []).filter((b) => {
    const key = `${b.provider_id ?? ''}:${b.id}`;
    const details = benchmarkDetailsMap.get(key);
    const name = details?.name ?? b.id;

    if (benchmarkSearch) {
      const searchLower = benchmarkSearch.toLowerCase();
      if (!name.toLowerCase().includes(searchLower) && !b.id.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    if (metricFilter.length > 0) {
      const benchmarkMetrics = details?.metrics ?? [];
      if (!metricFilter.some((m) => benchmarkMetrics.includes(m))) {
        return false;
      }
    }

    return true;
  });

  return (
    <DrawerPanelContent isResizable minSize="380px" data-testid="collection-drawer-panel">
      <DrawerHead>
        <Stack hasGutter>
          {collection.category && (
            <StackItem>
              <Label color={color}>{capitalizeFirst(collection.category)}</Label>
            </StackItem>
          )}
          <StackItem>
            <Title headingLevel="h2">{collection.name}</Title>
          </StackItem>
        </Stack>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>

      <DrawerPanelBody style={{ flex: 1, overflowY: 'auto' }}>
        <Stack hasGutter>
          {collection.description && (
            <StackItem>
              <Content component="p">{collection.description}</Content>
            </StackItem>
          )}

          {collection.benchmarks && collection.benchmarks.length > 0 && (
            <StackItem>
              <Stack hasGutter>
                <StackItem>
                  <Title
                    headingLevel="h4"
                    style={{
                      fontSize: 'var(--pf-t--global--font--size--body--default)',
                      fontWeight: 'var(--pf-t--global--font--weight--heading--default)',
                    }}
                  >
                    Benchmarks
                  </Title>
                </StackItem>
                <StackItem>
                  <Toolbar
                    clearAllFilters={() => {
                      setBenchmarkSearch('');
                      setMetricFilter([]);
                    }}
                  >
                    <ToolbarContent>
                      <ToolbarItem>
                        <SearchInput
                          placeholder="Find a benchmark"
                          value={benchmarkSearch}
                          onChange={(_event, value) => setBenchmarkSearch(value)}
                          onClear={() => setBenchmarkSearch('')}
                          data-testid="benchmark-search-input"
                        />
                      </ToolbarItem>
                      <ToolbarGroup variant="filter-group">
                        <SearchableMultiSelectFilter
                          categoryName="Metric"
                          options={availableMetrics}
                          selected={metricFilter}
                          formatLabel={getMetricDisplayName}
                          onToggleOption={(value) =>
                            setMetricFilter((prev) =>
                              prev.includes(value)
                                ? prev.filter((m) => m !== value)
                                : [...prev, value],
                            )
                          }
                          onClearAll={() => setMetricFilter([])}
                          testIdPrefix="benchmark-metric"
                        />
                      </ToolbarGroup>
                    </ToolbarContent>
                  </Toolbar>
                </StackItem>
                {filteredBenchmarks.length > 0 ? (
                  filteredBenchmarks.map((b) => {
                    const key = `${b.provider_id ?? ''}:${b.id}`;
                    const details = benchmarkDetailsMap.get(key);
                    return (
                      <StackItem key={`${b.provider_id ?? 'unknown'}-${b.id}`}>
                        <Card isCompact>
                          <CardBody>
                            <BenchmarkDrawerTileContent
                              name={details?.name ?? b.id}
                              id={b.id}
                              description={details?.description}
                              metrics={details?.metrics}
                              providerName={details?.providerName ?? b.provider_id}
                              providerAgent={details?.providerAgent}
                              primaryScore={details?.primary_score}
                              passCriteria={details?.pass_criteria}
                              url={details?.url ?? b.url}
                              trackingSurface="collection_drawer"
                              isCompact
                              isCollapsible
                            />
                          </CardBody>
                        </Card>
                      </StackItem>
                    );
                  })
                ) : (
                  <StackItem>
                    <EmptyState
                      variant={EmptyStateVariant.sm}
                      icon={SearchIcon}
                      titleText="No matching benchmarks"
                      data-testid="benchmark-search-empty-state"
                    >
                      <EmptyStateBody>
                        No benchmarks match the current filters. Try adjusting your search or filter
                        criteria.
                      </EmptyStateBody>
                    </EmptyState>
                  </StackItem>
                )}
              </Stack>
            </StackItem>
          )}
        </Stack>
      </DrawerPanelBody>

      <DrawerPanelBody style={{ flex: '0 0 auto' }} className="pf-v6-u-mt-md">
        <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapMd' }}>
          <FlexItem>
            <Button
              variant="primary"
              data-testid="use-benchmark-suite-button"
              onClick={() => onRunCollection(collection)}
            >
              Select benchmark suite
            </Button>
          </FlexItem>
          <FlexItem>
            <Button variant="link" onClick={onClose} data-testid="collection-drawer-close-footer">
              Close
            </Button>
          </FlexItem>
        </Flex>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default CollectionDrawerPanel;
