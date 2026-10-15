import * as React from 'react';
import {
  Alert,
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
  ExpandableSection,
  Flex,
  FlexItem,
  Label,
  LabelGroup,
  SearchInput,
  Stack,
  StackItem,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { ChartLineIcon, SearchIcon } from '@patternfly/react-icons';
import { Collection, ProviderAgentMetadata, ProviderBenchmark } from '~/app/types';
import BenchmarkDrawerTileContent from './BenchmarkDrawerTileContent';
import SearchableMultiSelectFilter from './SearchableMultiSelectFilter';
import { formatCollectionMetadataValue, getMetricDisplayName } from './benchmarkUtils';

export type BenchmarkWithProvider = ProviderBenchmark & {
  providerName: string;
  providerAgent?: ProviderAgentMetadata;
};

type CollectionDrawerPanelProps = {
  collection: Collection | undefined;
  benchmarkDetailsMap: Map<string, BenchmarkWithProvider>;
  onClose: () => void;
  onRunCollection: (c: Collection, isSystemCollection: boolean) => void;
  onCustomizeCollection?: (c: Collection) => void;
  isSystemCollection?: boolean;
  primaryActionLabel?: string;
  prerequisites?: Record<string, string>;
};

type CollectionLabelSectionProps = {
  title: string;
  values: string[];
  formatLabel?: (value: string) => string;
  testId: string;
};

type CollectionBenchmarksSectionProps = {
  collection: Collection;
  benchmarkDetailsMap: Map<string, BenchmarkWithProvider>;
  availableMetrics: string[];
};

const getCollectionDrawerSectionTitle = (title: string) => (
  <span className="pf-v6-u-text-color-regular pf-v6-u-font-size-md pf-v6-u-font-weight-bold">
    {title}
  </span>
);

const compareAlphabetically = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { sensitivity: 'base' });

const sortCollectionLabels = (
  values: string[],
  formatLabel: (value: string) => string = formatCollectionMetadataValue,
): string[] => values.toSorted((a, b) => compareAlphabetically(formatLabel(a), formatLabel(b)));

const CollectionLabelSection: React.FC<CollectionLabelSectionProps> = ({
  title,
  values,
  formatLabel = formatCollectionMetadataValue,
  testId,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  if (values.length === 0) {
    return null;
  }

  return (
    <StackItem>
      <ExpandableSection
        toggleContent={getCollectionDrawerSectionTitle(title)}
        isExpanded={isExpanded}
        isIndented
        onToggle={(_event, expanded) => setIsExpanded(expanded)}
        data-testid={`${testId}-section`}
      >
        <LabelGroup isCompact aria-label={title} data-testid={`${testId}-labels`}>
          {values.map((value) => (
            <Label key={value} isCompact variant="outline">
              {formatLabel(value)}
            </Label>
          ))}
        </LabelGroup>
      </ExpandableSection>
    </StackItem>
  );
};

const CollectionBenchmarksSection: React.FC<CollectionBenchmarksSectionProps> = ({
  collection,
  benchmarkDetailsMap,
  availableMetrics,
}) => {
  const [benchmarkSearch, setBenchmarkSearch] = React.useState('');
  const [metricFilter, setMetricFilter] = React.useState<string[]>([]);
  const [isBenchmarksExpanded, setIsBenchmarksExpanded] = React.useState(true);

  const filteredBenchmarks = (collection.benchmarks ?? [])
    .filter((b) => {
      const key = `${b.provider_id ?? ''}:${b.id}`;
      const details = benchmarkDetailsMap.get(key);
      const name = details?.name ?? b.id;

      if (benchmarkSearch) {
        const searchLower = benchmarkSearch.toLowerCase();
        if (
          !name.toLowerCase().includes(searchLower) &&
          !b.id.toLowerCase().includes(searchLower)
        ) {
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
    })
    .toSorted((a, b) => {
      const aName = benchmarkDetailsMap.get(`${a.provider_id ?? ''}:${a.id}`)?.name ?? a.id;
      const bName = benchmarkDetailsMap.get(`${b.provider_id ?? ''}:${b.id}`)?.name ?? b.id;
      return compareAlphabetically(aName, bName) || compareAlphabetically(a.id, b.id);
    });

  return (
    <StackItem>
      <ExpandableSection
        toggleContent={getCollectionDrawerSectionTitle('Benchmarks')}
        isExpanded={isBenchmarksExpanded}
        isIndented
        onToggle={(_event, expanded) => setIsBenchmarksExpanded(expanded)}
        data-testid="collection-drawer-benchmarks-section"
      >
        <Stack hasGutter>
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
                    categoryName="Metrics"
                    icon={<ChartLineIcon aria-hidden="true" />}
                    options={availableMetrics}
                    selected={metricFilter}
                    formatLabel={getMetricDisplayName}
                    onToggleOption={(value) =>
                      setMetricFilter((prev) =>
                        prev.includes(value) ? prev.filter((m) => m !== value) : [...prev, value],
                      )
                    }
                    onClearAll={() => setMetricFilter([])}
                    testIdPrefix="benchmark-metric"
                    popperProps={{ position: 'right', preventOverflow: true }}
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
                      {/* Collection benchmarks can override provider defaults for
                         primary_score, pass_criteria, and url. */}
                      <BenchmarkDrawerTileContent
                        name={details?.name ?? b.id}
                        id={b.id}
                        description={details?.description}
                        metrics={details?.metrics}
                        providerName={details?.providerName ?? b.provider_id}
                        providerAgent={details?.providerAgent}
                        primaryScore={b.primary_score ?? details?.primary_score}
                        passCriteria={b.pass_criteria ?? details?.pass_criteria}
                        url={b.url ?? details?.url}
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
      </ExpandableSection>
    </StackItem>
  );
};

const CollectionDrawerPanel: React.FC<CollectionDrawerPanelProps> = ({
  collection,
  benchmarkDetailsMap,
  onClose,
  onRunCollection,
  onCustomizeCollection,
  isSystemCollection = false,
  primaryActionLabel = 'Select collection',
  prerequisites,
}) => {
  const availableMetrics = React.useMemo(() => {
    const metricSet = new Set<string>();
    (collection?.benchmarks ?? []).forEach((b) => {
      const key = `${b.provider_id ?? ''}:${b.id}`;
      const details = benchmarkDetailsMap.get(key);
      (details?.metrics ?? []).forEach((m) => metricSet.add(m));
    });
    return Array.from(metricSet).toSorted((a, b) =>
      compareAlphabetically(getMetricDisplayName(a), getMetricDisplayName(b)),
    );
  }, [collection?.benchmarks, benchmarkDetailsMap]);

  const metadataSections = [
    {
      title: 'Metrics evaluated',
      values: sortCollectionLabels(availableMetrics, getMetricDisplayName),
      formatLabel: getMetricDisplayName,
      testId: 'collection-drawer-metrics',
    },
    {
      title: 'Modalities',
      values: sortCollectionLabels(collection?.modalities ?? []),
      testId: 'collection-drawer-modalities',
    },
    {
      title: 'Tasks',
      values: sortCollectionLabels(collection?.tasks ?? []),
      testId: 'collection-drawer-tasks',
    },
    {
      title: 'Tags',
      values: sortCollectionLabels(collection?.tags ?? []),
      testId: 'collection-drawer-tags',
    },
  ];

  if (!collection) {
    // DrawerPanelContent must remain in the DOM for PF's slide-in/out CSS transition to work
    return <DrawerPanelContent isResizable minSize="380px" />;
  }

  const prerequisite = collection.resource.tenant
    ? undefined
    : prerequisites?.[collection.resource.id];
  const showCustomize = Boolean(onCustomizeCollection && (isSystemCollection || prerequisite));

  return (
    <DrawerPanelContent isResizable minSize="380px" data-testid="collection-drawer-panel">
      <DrawerHead>
        <Stack hasGutter>
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

          {prerequisite ? (
            <StackItem>
              <Alert
                variant="info"
                isInline
                title="Prerequisite"
                data-testid="collection-drawer-prerequisite"
              >
                {prerequisite}
              </Alert>
            </StackItem>
          ) : null}

          {metadataSections.map((section) => (
            <CollectionLabelSection key={section.title} {...section} />
          ))}

          {collection.benchmarks && collection.benchmarks.length > 0 && (
            <CollectionBenchmarksSection
              key={collection.resource.id}
              collection={collection}
              benchmarkDetailsMap={benchmarkDetailsMap}
              availableMetrics={availableMetrics}
            />
          )}
        </Stack>
      </DrawerPanelBody>

      <DrawerPanelBody style={{ flex: '0 0 auto' }} className="pf-v6-u-mt-md">
        <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapMd' }}>
          {!prerequisite ? (
            <FlexItem>
              <Button
                variant="primary"
                data-testid="use-benchmark-suite-button"
                onClick={() => onRunCollection(collection, isSystemCollection)}
              >
                {primaryActionLabel}
              </Button>
            </FlexItem>
          ) : null}
          {showCustomize ? (
            <FlexItem>
              <Button
                variant="secondary"
                onClick={() => onCustomizeCollection?.(collection)}
                data-testid="customize-benchmark-suite-button"
              >
                Customize
              </Button>
            </FlexItem>
          ) : null}
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
