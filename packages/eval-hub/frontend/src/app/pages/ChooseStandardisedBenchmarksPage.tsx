import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Content,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Gallery,
  Label,
  LabelGroup,
  Pagination,
  PageSection,
  SearchInput,
  Spinner,
  Stack,
  StackItem,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { Link, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FilterToolbar from '@odh-dashboard/internal/components/FilterToolbar';
import { useProviders } from '~/app/hooks/useProviders';
import { ProviderBenchmark } from '~/app/types';
import { evaluationCreateRoute, evaluationsBaseRoute } from '~/app/routes';
import {
  BenchmarkFilterOptions,
  BenchmarkFilterDataType,
  benchmarkFilterConfig,
  initialBenchmarkFilterData,
} from './const';

const CATEGORY_COLOR_PALETTE: (
  | 'orange'
  | 'blue'
  | 'green'
  | 'purple'
  | 'teal'
  | 'red'
  | 'yellow'
)[] = ['blue', 'teal', 'green', 'purple', 'orange', 'red', 'yellow'];

const getCategoryColor = (
  category?: string,
): 'orange' | 'blue' | 'green' | 'purple' | 'teal' | 'red' | 'yellow' => {
  if (!category) {
    return 'blue';
  }
  const hash = category
    .toLowerCase()
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CATEGORY_COLOR_PALETTE[hash % CATEGORY_COLOR_PALETTE.length];
};

const VISIBLE_METRICS_COUNT = 3;

type FlatBenchmark = ProviderBenchmark & { providerId: string };

const BenchmarkDrawerPanel: React.FC<{
  benchmark: FlatBenchmark | undefined;
  onClose: () => void;
}> = ({ benchmark, onClose }) => {
  if (!benchmark) {
    return null;
  }

  const color = getCategoryColor(benchmark.category);

  return (
    <DrawerPanelContent isResizable minSize="400px" data-testid="benchmark-drawer-panel">
      <DrawerHead>
        <Stack hasGutter>
          {benchmark.category && (
            <StackItem>
              <Label color={color} isCompact>
                {benchmark.category}
              </Label>
            </StackItem>
          )}
          <StackItem>
            <Title headingLevel="h2" size="xl">
              {benchmark.name}
            </Title>
          </StackItem>
        </Stack>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} />
        </DrawerActions>
      </DrawerHead>

      <DrawerPanelBody style={{ flex: 1, overflowY: 'auto' }}>
        <Stack hasGutter>
          {benchmark.description && (
            <StackItem>
              <Content component="p">{benchmark.description}</Content>
            </StackItem>
          )}

          {benchmark.metrics && benchmark.metrics.length > 0 && (
            <StackItem>
              <Stack hasGutter>
                <StackItem>
                  <Content component="h4">Metrics evaluated</Content>
                </StackItem>
                <StackItem>
                  <LabelGroup numLabels={benchmark.metrics.length} isCompact>
                    {benchmark.metrics.map((metric) => (
                      <Label key={metric} isCompact variant="outline">
                        {metric}
                      </Label>
                    ))}
                  </LabelGroup>
                </StackItem>
              </Stack>
            </StackItem>
          )}
        </Stack>
      </DrawerPanelBody>

      <DrawerPanelBody style={{ flex: '0 0 auto' }}>
        <Button variant="primary">Run Benchmark</Button>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

const BenchmarkCard: React.FC<{
  benchmark: FlatBenchmark;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ benchmark, isSelected, onSelect }) => {
  const color = getCategoryColor(benchmark.category);

  return (
    <Card
      isSelected={isSelected}
      style={{ cursor: 'pointer' }}
      data-testid={`benchmark-card-${benchmark.id}`}
      onClick={onSelect}
    >
      {benchmark.category && (
        <CardHeader>
          <Label color={color} isCompact>
            {benchmark.category}
          </Label>
        </CardHeader>
      )}
      <CardTitle>{benchmark.name}</CardTitle>

      <CardBody>
        {benchmark.description && <Content component="p">{benchmark.description}</Content>}
        {benchmark.metrics && benchmark.metrics.length > 0 && (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div onClick={(e) => e.stopPropagation()}>
            <LabelGroup numLabels={VISIBLE_METRICS_COUNT} isCompact>
              {benchmark.metrics.map((metric) => (
                <Label key={metric} isCompact variant="outline">
                  {metric}
                </Label>
              ))}
            </LabelGroup>
          </div>
        )}
      </CardBody>

      <CardFooter>
        <Button
          variant="link"
          isInline
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          Run benchmark
        </Button>
      </CardFooter>
    </Card>
  );
};

const ChooseStandardisedBenchmarksPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const { providers, loaded, loadError } = useProviders(namespace ?? '');

  const allBenchmarks = React.useMemo<FlatBenchmark[]>(
    () =>
      providers.flatMap((provider) =>
        (provider.benchmarks ?? []).map((b) => ({
          ...b,
          providerId: provider.resource.id,
        })),
      ),
    [providers],
  );

  const [filterData, setFilterData] = React.useState<BenchmarkFilterDataType>(
    initialBenchmarkFilterData,
  );

  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);

  const [selectedBenchmark, setSelectedBenchmark] = React.useState<FlatBenchmark | undefined>(
    undefined,
  );

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const onClearFilters = React.useCallback(() => setFilterData(initialBenchmarkFilterData), []);

  const filteredBenchmarks = React.useMemo<FlatBenchmark[]>(() => {
    const rawName = filterData[BenchmarkFilterOptions.name];
    const rawCategory = filterData[BenchmarkFilterOptions.category];
    const rawMetrics = filterData[BenchmarkFilterOptions.metrics];

    const nameFilter =
      typeof rawName === 'string' ? rawName.toLowerCase().trim() || undefined : undefined;
    const categoryFilter =
      typeof rawCategory === 'string' ? rawCategory.toLowerCase().trim() || undefined : undefined;
    const metricsFilter =
      typeof rawMetrics === 'string' ? rawMetrics.toLowerCase().trim() || undefined : undefined;

    return allBenchmarks.filter((b) => {
      if (nameFilter && !b.name.toLowerCase().includes(nameFilter)) {
        return false;
      }
      if (categoryFilter && !(b.category?.toLowerCase().includes(categoryFilter) ?? false)) {
        return false;
      }
      if (
        metricsFilter &&
        !(b.metrics?.some((m) => m.toLowerCase().includes(metricsFilter)) ?? false)
      ) {
        return false;
      }
      return true;
    });
  }, [allBenchmarks, filterData]);

  React.useEffect(() => {
    setPage(1);
  }, [filterData]);

  const paginatedBenchmarks = React.useMemo<FlatBenchmark[]>(() => {
    const start = (page - 1) * perPage;
    return filteredBenchmarks.slice(start, start + perPage);
  }, [filteredBenchmarks, page, perPage]);

  const handleSelectBenchmark = (benchmark: FlatBenchmark) => {
    setSelectedBenchmark((prev) =>
      prev?.id === benchmark.id && prev.providerId === benchmark.providerId ? undefined : benchmark,
    );
  };
  const hasActiveFilters = Object.values(filterData).some((v) => v && String(v).trim());

  return (
    <Drawer isExpanded={!!selectedBenchmark} isInline>
      <DrawerContent
        panelContent={
          <BenchmarkDrawerPanel
            benchmark={selectedBenchmark}
            onClose={() => setSelectedBenchmark(undefined)}
          />
        }
      >
        <DrawerContentBody>
          <ApplicationsPage
            title="Single benchmark"
            description="Select a benchmark to run on your model, agent or pre-recorded responses."
            breadcrumb={
              <Breadcrumb>
                <BreadcrumbItem
                  render={() => <Link to={evaluationsBaseRoute(namespace)}>Evaluations</Link>}
                />
                <BreadcrumbItem
                  render={() => (
                    <Link to={evaluationCreateRoute(namespace)}>Create evaluation run</Link>
                  )}
                />
                <BreadcrumbItem isActive>Single benchmark</BreadcrumbItem>
              </Breadcrumb>
            }
            loaded={loaded}
            loadError={loadError}
            empty={false}
          >
            <PageSection hasBodyWrapper={false} isFilled>
              {!loaded ? (
                <Bullseye>
                  <Spinner />
                </Bullseye>
              ) : (
                <Stack hasGutter>
                  <StackItem>
                    <Toolbar clearAllFilters={onClearFilters}>
                      <ToolbarContent>
                        <FilterToolbar<keyof typeof benchmarkFilterConfig>
                          data-testid="benchmarks-filter-toolbar"
                          filterOptions={benchmarkFilterConfig}
                          filterOptionRenders={{
                            [BenchmarkFilterOptions.category]: ({ onChange, ...props }) => (
                              <SearchInput
                                {...props}
                                aria-label="Filter by category"
                                placeholder="Filter by category"
                                onChange={(_event, value) => onChange(value)}
                              />
                            ),
                            [BenchmarkFilterOptions.name]: ({ onChange, ...props }) => (
                              <SearchInput
                                {...props}
                                aria-label="Filter by name"
                                placeholder="Filter by name"
                                onChange={(_event, value) => onChange(value)}
                              />
                            ),
                            [BenchmarkFilterOptions.metrics]: ({ onChange, ...props }) => (
                              <SearchInput
                                {...props}
                                aria-label="Filter by metrics"
                                placeholder="Filter by metrics"
                                onChange={(_event, value) => onChange(value)}
                              />
                            ),
                          }}
                          filterData={filterData}
                          onFilterUpdate={onFilterUpdate}
                        >
                          <ToolbarItem
                            variant="pagination"
                            align={{ default: 'alignEnd' }}
                            className="pf-v6-u-pr-lg"
                          >
                            <Pagination
                              itemCount={filteredBenchmarks.length}
                              page={page}
                              perPage={perPage}
                              onSetPage={(_evt, p) => setPage(p)}
                              onPerPageSelect={(_evt, pp) => {
                                setPerPage(pp);
                                setPage(1);
                              }}
                              perPageOptions={[
                                { title: '10', value: 10 },
                                { title: '20', value: 20 },
                                { title: '30', value: 30 },
                              ]}
                              variant="top"
                              widgetId="benchmarks-pagination"
                              menuAppendTo="inline"
                              titles={{ paginationAriaLabel: 'top pagination' }}
                            />
                          </ToolbarItem>
                        </FilterToolbar>
                      </ToolbarContent>
                    </Toolbar>
                  </StackItem>

                  <StackItem isFilled>
                    {paginatedBenchmarks.length === 0 ? (
                      <Bullseye>
                        <EmptyState variant={EmptyStateVariant.sm}>
                          <Title headingLevel="h2" size="lg">
                            No benchmarks found
                          </Title>
                          <EmptyStateBody>
                            {hasActiveFilters
                              ? 'No benchmarks match the filter criteria. Try adjusting or clearing your filters.'
                              : 'No benchmarks are currently available.'}
                          </EmptyStateBody>
                          {hasActiveFilters && (
                            <Button variant="link" onClick={onClearFilters}>
                              Clear all filters
                            </Button>
                          )}
                        </EmptyState>
                      </Bullseye>
                    ) : (
                      <Gallery hasGutter minWidths={{ default: '280px' }}>
                        {paginatedBenchmarks.map((benchmark) => (
                          <BenchmarkCard
                            key={`${benchmark.providerId}-${benchmark.id}`}
                            benchmark={benchmark}
                            isSelected={
                              selectedBenchmark?.id === benchmark.id &&
                              selectedBenchmark.providerId === benchmark.providerId
                            }
                            onSelect={() => handleSelectBenchmark(benchmark)}
                          />
                        ))}
                      </Gallery>
                    )}
                  </StackItem>
                </Stack>
              )}
            </PageSection>
          </ApplicationsPage>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export default ChooseStandardisedBenchmarksPage;
