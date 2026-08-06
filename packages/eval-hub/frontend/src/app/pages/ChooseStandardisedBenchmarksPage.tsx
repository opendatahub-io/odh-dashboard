import * as React from 'react';
import {
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  Divider,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Gallery,
  MenuSearch,
  MenuSearchInput,
  MenuToggle,
  Pagination,
  PageSection,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Stack,
  StackItem,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { useProviders } from '~/app/hooks/useProviders';
import { FlatBenchmark } from '~/app/types';
import { evaluationCreateRoute, evaluationStartRoute, evaluationsBaseRoute } from '~/app/routes';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import BenchmarkDrawerPanel from '~/app/components/BenchmarkDrawerPanel';
import BenchmarkCard from '~/app/components/BenchmarkCard';
import { formatCategory, getMetricDisplayName } from '~/app/components/benchmarkUtils';
import {
  BenchmarkFilterOptions,
  BenchmarkFilterDataType,
  initialBenchmarkFilterData,
} from './const';

const PAGE_SIZES = [12, 24, 36];

const ChooseStandardisedBenchmarksPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const navigate = useNavigate();
  const { providers, loaded, loadError } = useProviders(namespace ?? '');

  const handleRunBenchmark = React.useCallback(
    (b: FlatBenchmark) => {
      fireMiscTrackingEvent(EVAL_HUB_EVENTS.BENCHMARK_RUN_SELECTED, {
        runType: 'single',
        benchmarkTypes: JSON.stringify([b.id]),
        countOfBenchmarks: 1,
      });
      const params = new URLSearchParams({
        type: 'benchmark',
        providerId: b.providerId,
        benchmarkId: b.id,
      });
      navigate(`${evaluationStartRoute(namespace)}?${params.toString()}`, {
        state: { benchmark: b },
      });
    },
    [navigate, namespace],
  );

  const allBenchmarks = React.useMemo<FlatBenchmark[]>(
    () =>
      providers.flatMap((provider) =>
        (provider.benchmarks ?? []).map((b) => ({
          ...b,
          providerId: provider.resource.id,
          providerName: provider.title ?? provider.name,
        })),
      ),
    [providers],
  );

  const [filterData, setFilterData] = React.useState<BenchmarkFilterDataType>(
    initialBenchmarkFilterData,
  );

  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(PAGE_SIZES[1]);

  const [selectedBenchmark, setSelectedBenchmark] = React.useState<FlatBenchmark | undefined>(
    undefined,
  );

  const [isCategoryOpen, setIsCategoryOpen] = React.useState(false);
  const [categorySearch, setCategorySearch] = React.useState('');
  const [isMetricsOpen, setIsMetricsOpen] = React.useState(false);
  const [metricsSearch, setMetricsSearch] = React.useState('');

  const availableCategories = React.useMemo<string[]>(
    () =>
      [
        ...new Set(allBenchmarks.map((b) => b.category).filter((c): c is string => c != null)),
      ].toSorted(),
    [allBenchmarks],
  );

  const availableMetrics = React.useMemo<string[]>(
    () => [...new Set(allBenchmarks.flatMap((b) => b.metrics ?? []))].toSorted(),
    [allBenchmarks],
  );

  const onClearFilters = React.useCallback(() => setFilterData(initialBenchmarkFilterData), []);

  const filteredBenchmarks = React.useMemo<FlatBenchmark[]>(() => {
    const nameFilter = filterData[BenchmarkFilterOptions.name].toLowerCase().trim() || undefined;
    const categoryFilters = filterData[BenchmarkFilterOptions.category];
    const metricsFilters = filterData[BenchmarkFilterOptions.metrics];

    return allBenchmarks.filter((b) => {
      if (nameFilter && !b.name.toLowerCase().includes(nameFilter)) {
        return false;
      }
      if (categoryFilters.length > 0 && !categoryFilters.includes(b.category ?? '')) {
        return false;
      }
      if (
        metricsFilters.length > 0 &&
        !(b.metrics?.some((m) => metricsFilters.includes(m)) ?? false)
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
  const hasActiveFilters =
    filterData[BenchmarkFilterOptions.name].trim() !== '' ||
    filterData[BenchmarkFilterOptions.category].length > 0 ||
    filterData[BenchmarkFilterOptions.metrics].length > 0;

  return (
    <Drawer isExpanded={!!selectedBenchmark}>
      <DrawerContent
        panelContent={
          <BenchmarkDrawerPanel
            benchmark={selectedBenchmark}
            onClose={() => setSelectedBenchmark(undefined)}
            onRunBenchmark={handleRunBenchmark}
          />
        }
      >
        <DrawerContentBody>
          <ApplicationsPage
            title="Select benchmark"
            description="Select a benchmark to run on your model, agent, or dataset."
            breadcrumb={
              <Breadcrumb>
                <BreadcrumbItem
                  render={() => <Link to={evaluationsBaseRoute(namespace)}>Evaluations</Link>}
                />
                <BreadcrumbItem
                  render={() => (
                    <Link to={evaluationCreateRoute(namespace)}>Select evaluation type</Link>
                  )}
                />
                <BreadcrumbItem isActive>Select benchmark</BreadcrumbItem>
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
                        <ToolbarToggleGroup breakpoint="md" toggleIcon={<FilterIcon />}>
                          <ToolbarGroup
                            variant="filter-group"
                            data-testid="benchmarks-filter-toolbar"
                          >
                            <ToolbarFilter
                              labels={
                                filterData[BenchmarkFilterOptions.name]
                                  ? [filterData[BenchmarkFilterOptions.name]]
                                  : []
                              }
                              deleteLabel={() =>
                                setFilterData((prev) => ({
                                  ...prev,
                                  [BenchmarkFilterOptions.name]: '',
                                }))
                              }
                              categoryName="Name"
                            >
                              <SearchInput
                                aria-label="Filter by name"
                                placeholder="Filter by name"
                                value={filterData[BenchmarkFilterOptions.name]}
                                onChange={(_event, value) =>
                                  setFilterData((prev) => ({
                                    ...prev,
                                    [BenchmarkFilterOptions.name]: value,
                                  }))
                                }
                                onClear={() =>
                                  setFilterData((prev) => ({
                                    ...prev,
                                    [BenchmarkFilterOptions.name]: '',
                                  }))
                                }
                                data-testid="benchmarks-name-filter"
                              />
                            </ToolbarFilter>
                            <ToolbarFilter
                              labels={filterData[BenchmarkFilterOptions.category].map((c) => ({
                                key: c,
                                node: formatCategory(c),
                              }))}
                              deleteLabel={(_category, label) => {
                                const val = typeof label === 'string' ? label : label.key;
                                setFilterData((prev) => ({
                                  ...prev,
                                  [BenchmarkFilterOptions.category]: prev[
                                    BenchmarkFilterOptions.category
                                  ].filter((c) => c !== val),
                                }));
                              }}
                              deleteLabelGroup={() =>
                                setFilterData((prev) => ({
                                  ...prev,
                                  [BenchmarkFilterOptions.category]: [],
                                }))
                              }
                              categoryName="Category"
                            >
                              <Select
                                role="menu"
                                isOpen={isCategoryOpen}
                                onSelect={(_event, value) => {
                                  const val = String(value);
                                  setFilterData((prev) => ({
                                    ...prev,
                                    [BenchmarkFilterOptions.category]: prev[
                                      BenchmarkFilterOptions.category
                                    ].includes(val)
                                      ? prev[BenchmarkFilterOptions.category].filter(
                                          (c) => c !== val,
                                        )
                                      : [...prev[BenchmarkFilterOptions.category], val],
                                  }));
                                }}
                                onOpenChange={(open) => {
                                  setIsCategoryOpen(open);
                                  if (!open) {
                                    setCategorySearch('');
                                  }
                                }}
                                toggle={(toggleRef) => (
                                  <MenuToggle
                                    ref={toggleRef}
                                    onClick={() => setIsCategoryOpen((prev) => !prev)}
                                    isExpanded={isCategoryOpen}
                                    data-testid="benchmarks-category-filter"
                                    badge={
                                      filterData[BenchmarkFilterOptions.category].length > 0 ? (
                                        <Badge isRead>
                                          {filterData[BenchmarkFilterOptions.category].length}
                                        </Badge>
                                      ) : undefined
                                    }
                                  >
                                    Category
                                  </MenuToggle>
                                )}
                                data-testid="benchmarks-category-select"
                              >
                                <MenuSearch>
                                  <MenuSearchInput>
                                    <SearchInput
                                      aria-label="Search categories"
                                      placeholder="Search categories"
                                      value={categorySearch}
                                      onChange={(_event, value) => setCategorySearch(value)}
                                      onClear={() => setCategorySearch('')}
                                    />
                                  </MenuSearchInput>
                                </MenuSearch>
                                <Divider />
                                <SelectList>
                                  {(() => {
                                    const filtered = availableCategories.filter((cat) => {
                                      const search = categorySearch.toLowerCase();
                                      return (
                                        cat.toLowerCase().includes(search) ||
                                        formatCategory(cat).toLowerCase().includes(search)
                                      );
                                    });
                                    return filtered.length > 0 ? (
                                      filtered.map((cat) => (
                                        <SelectOption
                                          key={cat}
                                          value={cat}
                                          hasCheckbox
                                          isSelected={filterData[
                                            BenchmarkFilterOptions.category
                                          ].includes(cat)}
                                        >
                                          {formatCategory(cat)}
                                        </SelectOption>
                                      ))
                                    ) : (
                                      <SelectOption isDisabled>No results found</SelectOption>
                                    );
                                  })()}
                                </SelectList>
                              </Select>
                            </ToolbarFilter>
                            <ToolbarFilter
                              labels={filterData[BenchmarkFilterOptions.metrics].map((m) => ({
                                key: m,
                                node: getMetricDisplayName(m),
                              }))}
                              deleteLabel={(_category, label) => {
                                const val = typeof label === 'string' ? label : label.key;
                                setFilterData((prev) => ({
                                  ...prev,
                                  [BenchmarkFilterOptions.metrics]: prev[
                                    BenchmarkFilterOptions.metrics
                                  ].filter((m) => m !== val),
                                }));
                              }}
                              deleteLabelGroup={() =>
                                setFilterData((prev) => ({
                                  ...prev,
                                  [BenchmarkFilterOptions.metrics]: [],
                                }))
                              }
                              categoryName="Metrics"
                            >
                              <Select
                                role="menu"
                                isOpen={isMetricsOpen}
                                onSelect={(_event, value) => {
                                  const val = String(value);
                                  setFilterData((prev) => ({
                                    ...prev,
                                    [BenchmarkFilterOptions.metrics]: prev[
                                      BenchmarkFilterOptions.metrics
                                    ].includes(val)
                                      ? prev[BenchmarkFilterOptions.metrics].filter(
                                          (m) => m !== val,
                                        )
                                      : [...prev[BenchmarkFilterOptions.metrics], val],
                                  }));
                                }}
                                onOpenChange={(open) => {
                                  setIsMetricsOpen(open);
                                  if (!open) {
                                    setMetricsSearch('');
                                  }
                                }}
                                toggle={(toggleRef) => (
                                  <MenuToggle
                                    ref={toggleRef}
                                    onClick={() => setIsMetricsOpen((prev) => !prev)}
                                    isExpanded={isMetricsOpen}
                                    data-testid="benchmarks-metrics-filter"
                                    badge={
                                      filterData[BenchmarkFilterOptions.metrics].length > 0 ? (
                                        <Badge isRead>
                                          {filterData[BenchmarkFilterOptions.metrics].length}
                                        </Badge>
                                      ) : undefined
                                    }
                                  >
                                    Metrics
                                  </MenuToggle>
                                )}
                                data-testid="benchmarks-metrics-select"
                              >
                                <MenuSearch>
                                  <MenuSearchInput>
                                    <SearchInput
                                      aria-label="Search metrics"
                                      placeholder="Search metrics"
                                      value={metricsSearch}
                                      onChange={(_event, value) => setMetricsSearch(value)}
                                      onClear={() => setMetricsSearch('')}
                                    />
                                  </MenuSearchInput>
                                </MenuSearch>
                                <Divider />
                                <SelectList>
                                  {(() => {
                                    const filtered = availableMetrics.filter((metric) => {
                                      const search = metricsSearch.toLowerCase();
                                      return (
                                        metric.toLowerCase().includes(search) ||
                                        getMetricDisplayName(metric).toLowerCase().includes(search)
                                      );
                                    });
                                    return filtered.length > 0 ? (
                                      filtered.map((metric) => (
                                        <SelectOption
                                          key={metric}
                                          value={metric}
                                          hasCheckbox
                                          isSelected={filterData[
                                            BenchmarkFilterOptions.metrics
                                          ].includes(metric)}
                                        >
                                          {getMetricDisplayName(metric)}
                                        </SelectOption>
                                      ))
                                    ) : (
                                      <SelectOption isDisabled>No results found</SelectOption>
                                    );
                                  })()}
                                </SelectList>
                              </Select>
                            </ToolbarFilter>
                          </ToolbarGroup>
                        </ToolbarToggleGroup>
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
                            perPageOptions={PAGE_SIZES.map((size) => ({
                              title: String(size),
                              value: size,
                            }))}
                            variant="top"
                            widgetId="benchmarks-pagination"
                            menuAppendTo="inline"
                            titles={{ paginationAriaLabel: 'top pagination' }}
                          />
                        </ToolbarItem>
                      </ToolbarContent>
                    </Toolbar>
                  </StackItem>

                  <StackItem isFilled>
                    {paginatedBenchmarks.length === 0 ? (
                      <Bullseye>
                        <EmptyState
                          variant={EmptyStateVariant.sm}
                          data-testid="benchmarks-empty-state"
                        >
                          <Title headingLevel="h2" size="lg">
                            No benchmarks found
                          </Title>
                          <EmptyStateBody>
                            {hasActiveFilters
                              ? 'No benchmarks match the filter criteria. Try adjusting or clearing your filters.'
                              : 'No benchmarks are currently available.'}
                          </EmptyStateBody>
                          {hasActiveFilters && (
                            <Button
                              variant="link"
                              onClick={onClearFilters}
                              data-testid="benchmarks-clear-filters"
                            >
                              Clear all filters
                            </Button>
                          )}
                        </EmptyState>
                      </Bullseye>
                    ) : (
                      <Gallery
                        hasGutter
                        minWidths={{ default: '280px' }}
                        data-testid="benchmarks-gallery"
                      >
                        {paginatedBenchmarks.map((benchmark) => (
                          <BenchmarkCard
                            key={`${benchmark.providerId}-${benchmark.id}`}
                            benchmark={benchmark}
                            isSelected={
                              selectedBenchmark?.id === benchmark.id &&
                              selectedBenchmark.providerId === benchmark.providerId
                            }
                            onSelect={() => handleSelectBenchmark(benchmark)}
                            onRunBenchmark={() => handleRunBenchmark(benchmark)}
                          />
                        ))}
                      </Gallery>
                    )}
                  </StackItem>
                  {paginatedBenchmarks.length > 0 && (
                    <StackItem>
                      <Pagination
                        itemCount={filteredBenchmarks.length}
                        page={page}
                        perPage={perPage}
                        onSetPage={(_evt, p) => setPage(p)}
                        onPerPageSelect={(_evt, pp) => {
                          setPerPage(pp);
                          setPage(1);
                        }}
                        perPageOptions={PAGE_SIZES.map((size) => ({
                          title: String(size),
                          value: size,
                        }))}
                        variant="bottom"
                        widgetId="benchmarks-pagination-bottom"
                        menuAppendTo="inline"
                        titles={{ paginationAriaLabel: 'bottom pagination' }}
                      />
                    </StackItem>
                  )}
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
