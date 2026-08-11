import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Gallery,
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
import { FilterIcon, SortAmountDownIcon } from '@patternfly/react-icons';
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
import SearchableMultiSelectFilter from '~/app/components/SearchableMultiSelectFilter';
import {
  BenchmarkFilterOptions,
  BenchmarkFilterDataType,
  BenchmarkSortOption,
  benchmarkSortLabels,
  initialBenchmarkFilterData,
} from './const';

const PAGE_SIZES = [12, 24, 36];

const BENCHMARK_SORT_VALUES: readonly string[] = Object.values(BenchmarkSortOption);
const isBenchmarkSortOption = (value: unknown): value is BenchmarkSortOption =>
  typeof value === 'string' && BENCHMARK_SORT_VALUES.includes(value);

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
          providerAgent: provider.agent,
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

  const [sortOption, setSortOption] = React.useState(BenchmarkSortOption.DEFAULT);
  const [isSortOpen, setIsSortOpen] = React.useState(false);

  const availableCategories = React.useMemo<string[]>(
    () =>
      [
        ...new Set(allBenchmarks.map((b) => b.category).filter((c): c is string => Boolean(c))),
      ].toSorted(),
    [allBenchmarks],
  );

  const availableMetrics = React.useMemo<string[]>(
    () => [...new Set(allBenchmarks.flatMap((b) => b.metrics ?? []).filter(Boolean))].toSorted(),
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

  const sortedBenchmarks = React.useMemo<FlatBenchmark[]>(() => {
    switch (sortOption) {
      case BenchmarkSortOption.NAME:
        return filteredBenchmarks.toSorted((a, b) => a.name.localeCompare(b.name));
      case BenchmarkSortOption.CATEGORY:
        return filteredBenchmarks.toSorted((a, b) => {
          const catCmp = (a.category ?? '').localeCompare(b.category ?? '');
          return catCmp !== 0 ? catCmp : a.name.localeCompare(b.name);
        });
      default:
        return filteredBenchmarks;
    }
  }, [filteredBenchmarks, sortOption]);

  React.useEffect(() => {
    setPage(1);
  }, [filterData, sortOption, namespace]);

  const paginatedBenchmarks = React.useMemo<FlatBenchmark[]>(() => {
    const start = (page - 1) * perPage;
    return sortedBenchmarks.slice(start, start + perPage);
  }, [sortedBenchmarks, page, perPage]);

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
                        <ToolbarItem>
                          <Select
                            isOpen={isSortOpen}
                            selected={sortOption}
                            onSelect={(_event, value) => {
                              if (isBenchmarkSortOption(value)) {
                                setSortOption(value);
                              }
                              setIsSortOpen(false);
                            }}
                            onOpenChange={setIsSortOpen}
                            toggle={(toggleRef) => (
                              <MenuToggle
                                ref={toggleRef}
                                onClick={() => setIsSortOpen((prev) => !prev)}
                                isExpanded={isSortOpen}
                                icon={<SortAmountDownIcon />}
                                data-testid="benchmarks-sort-toggle"
                              >
                                {benchmarkSortLabels[sortOption]}
                              </MenuToggle>
                            )}
                            data-testid="benchmarks-sort-select"
                          >
                            <SelectList>
                              {Object.values(BenchmarkSortOption).map((opt) => (
                                <SelectOption
                                  key={opt}
                                  value={opt}
                                  isSelected={sortOption === opt}
                                  data-testid={`benchmarks-sort-option-${opt}`}
                                >
                                  {benchmarkSortLabels[opt]}
                                </SelectOption>
                              ))}
                            </SelectList>
                          </Select>
                        </ToolbarItem>
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
                            <SearchableMultiSelectFilter
                              categoryName="Category"
                              options={availableCategories}
                              selected={filterData[BenchmarkFilterOptions.category]}
                              formatLabel={formatCategory}
                              onToggleOption={(value) =>
                                setFilterData((prev) => ({
                                  ...prev,
                                  [BenchmarkFilterOptions.category]: prev[
                                    BenchmarkFilterOptions.category
                                  ].includes(value)
                                    ? prev[BenchmarkFilterOptions.category].filter(
                                        (c) => c !== value,
                                      )
                                    : [...prev[BenchmarkFilterOptions.category], value],
                                }))
                              }
                              onClearAll={() =>
                                setFilterData((prev) => ({
                                  ...prev,
                                  [BenchmarkFilterOptions.category]: [],
                                }))
                              }
                              testIdPrefix="benchmarks-category"
                            />
                            <SearchableMultiSelectFilter
                              categoryName="Metrics"
                              options={availableMetrics}
                              selected={filterData[BenchmarkFilterOptions.metrics]}
                              formatLabel={getMetricDisplayName}
                              onToggleOption={(value) =>
                                setFilterData((prev) => ({
                                  ...prev,
                                  [BenchmarkFilterOptions.metrics]: prev[
                                    BenchmarkFilterOptions.metrics
                                  ].includes(value)
                                    ? prev[BenchmarkFilterOptions.metrics].filter(
                                        (m) => m !== value,
                                      )
                                    : [...prev[BenchmarkFilterOptions.metrics], value],
                                }))
                              }
                              onClearAll={() =>
                                setFilterData((prev) => ({
                                  ...prev,
                                  [BenchmarkFilterOptions.metrics]: [],
                                }))
                              }
                              testIdPrefix="benchmarks-metrics"
                            />
                          </ToolbarGroup>
                        </ToolbarToggleGroup>
                        <ToolbarItem
                          variant="pagination"
                          align={{ default: 'alignEnd' }}
                          className="pf-v6-u-pr-lg"
                        >
                          <Pagination
                            itemCount={sortedBenchmarks.length}
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
                        itemCount={sortedBenchmarks.length}
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
