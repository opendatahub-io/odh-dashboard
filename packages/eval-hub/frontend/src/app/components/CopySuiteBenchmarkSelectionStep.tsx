import * as React from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Content,
  HelperText,
  HelperTextItem,
  Label,
  LabelGroup,
  Pagination,
  SearchInput,
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
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import {
  formatCategory,
  getBenchmarkTargetTypes,
  getCategoryColor,
  getMetricDisplayName,
} from '~/app/components/benchmarkUtils';
import CopySuiteBenchmarkDetailsOverlay from '~/app/components/CopySuiteBenchmarkDetailsOverlay';
import SearchableMultiSelectFilter from '~/app/components/SearchableMultiSelectFilter';
import { MAX_BENCHMARKS } from '~/app/pages/useCopySuiteForm';
import {
  BenchmarkFilterOptions,
  BenchmarkFilterDataType,
  initialBenchmarkFilterData,
} from '~/app/pages/const';
import {
  filterBenchmarks,
  getAvailableCategories,
  getAvailableEvaluates,
  getAvailableFrameworks,
  getAvailableMetrics,
  hasActiveBenchmarkFilters,
  sortBenchmarksByName,
} from '~/app/utilities/benchmarkListFilters';
import { getBenchmarkCategoryFiltersForAvailableCategories } from '~/app/utilities/collectionBenchmarkCategoryMap';
import {
  buildFlatBenchmarkByKey,
  toggleBenchmarkSelectionKey,
} from '~/app/utilities/benchmarkDetailsUtils';
import type { FlatBenchmark, Provider } from '~/app/types';
import { trackEvalHubEvent } from '~/app/tracking/evalhubTracking';
import useSearchInputTracking from '~/app/hooks/useSearchInputTracking';
import {
  EVAL_HUB_EVENTS,
  type BenchmarkCatalogFilterType,
} from '~/app/tracking/evalhubTrackingConstants';

import './CopySuiteBenchmarkSelectionStep.scss';

const PAGE_SIZE = 10;

type CatalogBenchmark = {
  key: string;
  providerId: string;
  framework: string;
  id: string;
  name: string;
  category?: string;
  metrics: string[];
  targetTypes: string[];
};

export type CopySuiteBenchmarkSelectionStepProps = {
  providers: Provider[];
  selectedBenchmarkKeys: string[];
  collectionCategories?: readonly string[];
  prefilterProviders?: boolean;
  isInteractionDisabled?: boolean;
  onNext: (selectedKeys: string[]) => void;
  onBack: () => void;
  onCancel: () => void;
};

const CopySuiteBenchmarkSelectionStep: React.FC<CopySuiteBenchmarkSelectionStepProps> = ({
  providers,
  selectedBenchmarkKeys,
  collectionCategories = [],
  prefilterProviders = false,
  isInteractionDisabled = false,
  onNext,
  onBack,
  onCancel,
}) => {
  const [draftSelectedBenchmarkKeys, setDraftSelectedBenchmarkKeys] =
    React.useState(selectedBenchmarkKeys);
  const [page, setPage] = React.useState(1);
  const [detailsBenchmarkKey, setDetailsBenchmarkKey] = React.useState<string | undefined>();

  React.useEffect(() => {
    setDraftSelectedBenchmarkKeys(selectedBenchmarkKeys);
  }, [selectedBenchmarkKeys]);

  const selected = React.useMemo(
    () => new Set(draftSelectedBenchmarkKeys),
    [draftSelectedBenchmarkKeys],
  );

  const catalogBenchmarks = React.useMemo<CatalogBenchmark[]>(() => {
    const benchmarks: CatalogBenchmark[] = [];

    providers.forEach((provider) => {
      const framework = provider.title ?? provider.name;
      const targetTypes = getBenchmarkTargetTypes(provider.agent);

      (provider.benchmarks ?? []).forEach((benchmark) => {
        benchmarks.push({
          key: `${provider.resource.id}:${benchmark.id}`,
          providerId: provider.resource.id,
          framework,
          id: benchmark.id,
          name: benchmark.name || benchmark.id,
          category: benchmark.category,
          metrics: benchmark.metrics ?? [],
          targetTypes,
        });
      });
    });

    return benchmarks;
  }, [providers]);

  const availableCategories = React.useMemo(
    () => getAvailableCategories(catalogBenchmarks),
    [catalogBenchmarks],
  );
  const availableEvaluates = React.useMemo(
    () => getAvailableEvaluates(catalogBenchmarks),
    [catalogBenchmarks],
  );
  const availableFrameworks = React.useMemo(
    () => getAvailableFrameworks(catalogBenchmarks),
    [catalogBenchmarks],
  );
  const availableMetrics = React.useMemo(
    () => getAvailableMetrics(catalogBenchmarks),
    [catalogBenchmarks],
  );
  const selectedProviderIds = React.useMemo(
    () =>
      new Set(
        selectedBenchmarkKeys
          .map((key) => key.slice(0, key.indexOf(':')))
          .filter((providerId) => providerId.length > 0),
      ),
    [selectedBenchmarkKeys],
  );
  const initialFrameworkFilters = React.useMemo(() => {
    if (!prefilterProviders) {
      return [];
    }

    const selectedFrameworks = new Set(
      catalogBenchmarks
        .filter((benchmark) => selectedProviderIds.has(benchmark.providerId))
        .map((benchmark) => benchmark.framework),
    );

    return availableFrameworks.filter((framework) => selectedFrameworks.has(framework));
  }, [availableFrameworks, catalogBenchmarks, prefilterProviders, selectedProviderIds]);
  const collectionCategoryKey = collectionCategories.toSorted().join('\u0000');
  const normalizedCollectionCategories = React.useMemo(
    () => (collectionCategoryKey ? collectionCategoryKey.split('\u0000') : []),
    [collectionCategoryKey],
  );
  const initialCategoryFilters = React.useMemo(() => {
    const mappedFilters = getBenchmarkCategoryFiltersForAvailableCategories(
      normalizedCollectionCategories,
      availableCategories,
    );
    if (mappedFilters.length === 0) {
      return mappedFilters;
    }

    // Benchmarks already in the suite must stay visible when copying/editing, even when their
    // category is outside the collection-category prefilter.
    const selectedBenchmarkKeySet = new Set(selectedBenchmarkKeys);
    const selectedCategories = catalogBenchmarks.flatMap((benchmark) =>
      selectedBenchmarkKeySet.has(benchmark.key) && benchmark.category ? [benchmark.category] : [],
    );

    return [...new Set([...mappedFilters, ...selectedCategories])].toSorted((left, right) =>
      left.localeCompare(right),
    );
  }, [
    availableCategories,
    catalogBenchmarks,
    normalizedCollectionCategories,
    selectedBenchmarkKeys,
  ]);
  const initialFilterData = React.useMemo(
    () => ({
      ...initialBenchmarkFilterData,
      [BenchmarkFilterOptions.category]: initialCategoryFilters,
      [BenchmarkFilterOptions.framework]: initialFrameworkFilters,
    }),
    [initialCategoryFilters, initialFrameworkFilters],
  );
  const [userFilterData, setUserFilterData] = React.useState<BenchmarkFilterDataType | null>(null);
  const filterData = userFilterData ?? initialFilterData;
  const hasUserAdjustedFilters = userFilterData !== null;
  const setFilterDataFromUser = React.useCallback(
    (action: React.SetStateAction<BenchmarkFilterDataType>) => {
      setUserFilterData((prev) =>
        typeof action === 'function' ? action(prev ?? initialFilterData) : action,
      );
    },
    [initialFilterData],
  );
  const filteredBenchmarks = React.useMemo(() => {
    const matchingBenchmarks = filterBenchmarks(catalogBenchmarks, filterData);
    if (hasUserAdjustedFilters) {
      return matchingBenchmarks;
    }

    const matchingBenchmarkKeys = new Set(matchingBenchmarks.map((benchmark) => benchmark.key));
    const selectedBenchmarkKeySet = new Set(selectedBenchmarkKeys);
    const selectedBenchmarks = catalogBenchmarks.filter(
      (benchmark) =>
        selectedBenchmarkKeySet.has(benchmark.key) && !matchingBenchmarkKeys.has(benchmark.key),
    );

    return [...matchingBenchmarks, ...selectedBenchmarks];
  }, [catalogBenchmarks, filterData, hasUserAdjustedFilters, selectedBenchmarkKeys]);
  const sortedBenchmarks = React.useMemo(
    () => [
      ...sortBenchmarksByName(
        filteredBenchmarks.filter((benchmark) => selected.has(benchmark.key)),
      ),
      ...sortBenchmarksByName(
        filteredBenchmarks.filter((benchmark) => !selected.has(benchmark.key)),
      ),
    ],
    [filteredBenchmarks, selected],
  );
  // Clamp instead of resetting via an effect: keeps the page valid when derived filters shrink
  // the result set after the user has paged ahead.
  const effectivePage = Math.min(page, Math.max(1, Math.ceil(sortedBenchmarks.length / PAGE_SIZE)));
  const paginatedBenchmarks = React.useMemo(() => {
    const start = (effectivePage - 1) * PAGE_SIZE;
    return sortedBenchmarks.slice(start, start + PAGE_SIZE);
  }, [sortedBenchmarks, effectivePage]);

  const selectionCount = draftSelectedBenchmarkKeys.length;
  const remainingSelections = MAX_BENCHMARKS - selectionCount;
  const isSelectionCountValid = selectionCount >= 1 && selectionCount <= MAX_BENCHMARKS;
  const isAtSelectionLimit = selectionCount >= MAX_BENCHMARKS;
  const hasTooManySelections = selectionCount > MAX_BENCHMARKS;
  const hasActiveFilters = hasActiveBenchmarkFilters(filterData);
  const hasAutoPrefilter =
    (initialCategoryFilters.length > 0 || initialFrameworkFilters.length > 0) &&
    !hasUserAdjustedFilters;
  const selectedCollectionCategoryNoun =
    normalizedCollectionCategories.length === 1 ? 'category' : 'categories';
  const flatBenchmarkByKey = React.useMemo(() => buildFlatBenchmarkByKey(providers), [providers]);
  const detailsBenchmark: FlatBenchmark | undefined = detailsBenchmarkKey
    ? flatBenchmarkByKey.get(detailsBenchmarkKey)
    : undefined;
  const isDetailsBenchmarkSelected = detailsBenchmarkKey
    ? selected.has(detailsBenchmarkKey)
    : false;

  const trackBenchmarkCatalogFilter = React.useCallback(
    (filterType: BenchmarkCatalogFilterType, selectedValues: string[]) => {
      const normalizedSelectedValues = [
        ...new Set(selectedValues.map((value) => value.trim()).filter(Boolean)),
      ].toSorted((first, second) =>
        first.localeCompare(second, undefined, { sensitivity: 'base' }),
      );

      if (normalizedSelectedValues.length === 0) {
        return;
      }

      trackEvalHubEvent(EVAL_HUB_EVENTS.BENCHMARK_CATALOG_FILTER_APPLIED, {
        filterType,
        value: normalizedSelectedValues.join(', '),
      });
    },
    [],
  );

  const handleSearchCommit = React.useCallback(
    (trimmedLength: number) => {
      trackBenchmarkCatalogFilter('search', [String(trimmedLength)]);
    },
    [trackBenchmarkCatalogFilter],
  );
  const searchInputTrackingProps = useSearchInputTracking(
    handleSearchCommit,
    filterData[BenchmarkFilterOptions.name],
  );

  const onClearFilters = React.useCallback(() => {
    setFilterDataFromUser(initialBenchmarkFilterData);
    setPage(1);
    searchInputTrackingProps.reset();
  }, [searchInputTrackingProps, setFilterDataFromUser]);

  const toggleSelection = React.useCallback((key: string) => {
    setPage(1);
    setDraftSelectedBenchmarkKeys((currentKeys) =>
      toggleBenchmarkSelectionKey(currentKeys, key, MAX_BENCHMARKS),
    );
  }, []);

  const handleNext = React.useCallback(() => {
    if (isSelectionCountValid && !isInteractionDisabled) {
      onNext([...draftSelectedBenchmarkKeys]);
    }
  }, [draftSelectedBenchmarkKeys, isInteractionDisabled, isSelectionCountValid, onNext]);

  return (
    <div
      id="copy-suite-step-content-select-benchmarks"
      className="evalhub-copy-suite-page__step"
      data-testid="copy-suite-step-select-benchmarks"
    >
      <fieldset
        disabled={isInteractionDisabled}
        className="evalhub-copy-suite-benchmark-catalog__fields"
        aria-busy={isInteractionDisabled}
      >
        <div className="evalhub-copy-suite-benchmark-catalog__content">
          <Title headingLevel="h1" size="2xl" data-testid="copy-suite-select-benchmarks-title">
            Select benchmarks
          </Title>
          <Content component="p">
            Search and select up to {MAX_BENCHMARKS} benchmarks to include in your collection.
          </Content>

          <Stack hasGutter>
            <StackItem>
              <Toolbar clearAllFilters={onClearFilters}>
                <ToolbarContent>
                  <ToolbarToggleGroup breakpoint="md" toggleIcon={<FilterIcon aria-hidden />}>
                    <ToolbarGroup variant="filter-group" data-testid="benchmark-catalog-filters">
                      <ToolbarFilter
                        labels={
                          filterData[BenchmarkFilterOptions.name]
                            ? [filterData[BenchmarkFilterOptions.name]]
                            : []
                        }
                        deleteLabel={() => {
                          setFilterDataFromUser((prev) => ({
                            ...prev,
                            [BenchmarkFilterOptions.name]: '',
                          }));
                          searchInputTrackingProps.reset();
                        }}
                        categoryName="Search"
                        className="evalhub-copy-suite-benchmark-catalog__search"
                      >
                        <SearchInput
                          aria-label="Search benchmarks"
                          placeholder="Search benchmarks"
                          value={filterData[BenchmarkFilterOptions.name]}
                          onChange={(_event, value) => {
                            setFilterDataFromUser((prev) => ({
                              ...prev,
                              [BenchmarkFilterOptions.name]: value,
                            }));
                            setPage(1);
                          }}
                          inputProps={searchInputTrackingProps.inputProps}
                          onClear={() => {
                            setFilterDataFromUser((prev) => ({
                              ...prev,
                              [BenchmarkFilterOptions.name]: '',
                            }));
                            setPage(1);
                            searchInputTrackingProps.reset();
                          }}
                          data-testid="benchmark-catalog-search"
                        />
                      </ToolbarFilter>
                      <SearchableMultiSelectFilter
                        categoryName="Category"
                        options={availableCategories}
                        selected={filterData[BenchmarkFilterOptions.category]}
                        formatLabel={formatCategory}
                        onToggleOption={(value) => {
                          const selectedValues = filterData[BenchmarkFilterOptions.category];
                          const nextSelectedValues = selectedValues.includes(value)
                            ? selectedValues.filter((item) => item !== value)
                            : [...selectedValues, value];
                          setFilterDataFromUser((prev) => ({
                            ...prev,
                            [BenchmarkFilterOptions.category]: nextSelectedValues,
                          }));
                          trackBenchmarkCatalogFilter('category', nextSelectedValues);
                          setPage(1);
                        }}
                        onClearAll={() => {
                          setFilterDataFromUser((prev) => ({
                            ...prev,
                            [BenchmarkFilterOptions.category]: [],
                          }));
                          setPage(1);
                        }}
                        testIdPrefix="benchmark-catalog-category"
                      />
                      <SearchableMultiSelectFilter
                        categoryName="Framework"
                        options={availableFrameworks}
                        selected={filterData[BenchmarkFilterOptions.framework]}
                        formatLabel={(value) => value}
                        onToggleOption={(value) => {
                          const selectedValues = filterData[BenchmarkFilterOptions.framework];
                          const nextSelectedValues = selectedValues.includes(value)
                            ? selectedValues.filter((item) => item !== value)
                            : [...selectedValues, value];
                          setFilterDataFromUser((prev) => ({
                            ...prev,
                            [BenchmarkFilterOptions.framework]: nextSelectedValues,
                          }));
                          trackBenchmarkCatalogFilter('framework', nextSelectedValues);
                          setPage(1);
                        }}
                        onClearAll={() => {
                          setFilterDataFromUser((prev) => ({
                            ...prev,
                            [BenchmarkFilterOptions.framework]: [],
                          }));
                          setPage(1);
                        }}
                        testIdPrefix="benchmark-catalog-framework"
                      />
                      <SearchableMultiSelectFilter
                        categoryName="Evaluates"
                        options={availableEvaluates}
                        selected={filterData[BenchmarkFilterOptions.evaluates]}
                        formatLabel={formatCategory}
                        onToggleOption={(value) => {
                          const selectedValues = filterData[BenchmarkFilterOptions.evaluates];
                          const nextSelectedValues = selectedValues.includes(value)
                            ? selectedValues.filter((item) => item !== value)
                            : [...selectedValues, value];
                          setFilterDataFromUser((prev) => ({
                            ...prev,
                            [BenchmarkFilterOptions.evaluates]: nextSelectedValues,
                          }));
                          trackBenchmarkCatalogFilter('evaluates', nextSelectedValues);
                          setPage(1);
                        }}
                        onClearAll={() => {
                          setFilterDataFromUser((prev) => ({
                            ...prev,
                            [BenchmarkFilterOptions.evaluates]: [],
                          }));
                          setPage(1);
                        }}
                        testIdPrefix="benchmark-catalog-evaluates"
                      />
                      <SearchableMultiSelectFilter
                        categoryName="Metrics"
                        options={availableMetrics}
                        selected={filterData[BenchmarkFilterOptions.metrics]}
                        formatLabel={getMetricDisplayName}
                        onToggleOption={(value) => {
                          const selectedValues = filterData[BenchmarkFilterOptions.metrics];
                          const nextSelectedValues = selectedValues.includes(value)
                            ? selectedValues.filter((item) => item !== value)
                            : [...selectedValues, value];
                          setFilterDataFromUser((prev) => ({
                            ...prev,
                            [BenchmarkFilterOptions.metrics]: nextSelectedValues,
                          }));
                          trackBenchmarkCatalogFilter('metric', nextSelectedValues);
                          setPage(1);
                        }}
                        onClearAll={() => {
                          setFilterDataFromUser((prev) => ({
                            ...prev,
                            [BenchmarkFilterOptions.metrics]: [],
                          }));
                          setPage(1);
                        }}
                        testIdPrefix="benchmark-catalog-metrics"
                      />
                    </ToolbarGroup>
                  </ToolbarToggleGroup>
                  <ToolbarItem variant="pagination" align={{ default: 'alignEnd' }}>
                    <Pagination
                      itemCount={sortedBenchmarks.length}
                      page={effectivePage}
                      perPage={PAGE_SIZE}
                      onSetPage={(_event, nextPage) => setPage(nextPage)}
                      widgetId="benchmark-catalog-pagination-top"
                      variant="top"
                      isCompact
                    />
                  </ToolbarItem>
                </ToolbarContent>
                {hasAutoPrefilter ? (
                  <ToolbarItem>
                    <Alert
                      variant="info"
                      isInline
                      isPlain
                      title={`Filters were applied automatically to show benchmarks matching the selected collection ${selectedCollectionCategoryNoun}.`}
                      data-testid="benchmark-catalog-prefilter-alert"
                    />
                  </ToolbarItem>
                ) : null}
              </Toolbar>
            </StackItem>
            <StackItem>
              <HelperText>
                <HelperTextItem
                  className="evalhub-copy-suite-benchmark-catalog__limit-message"
                  data-testid="benchmark-catalog-limit-message"
                >
                  {hasTooManySelections ? (
                    <strong>
                      Invalid selection: {selectionCount} benchmarks selected. Select no more than{' '}
                      {MAX_BENCHMARKS}.
                    </strong>
                  ) : (
                    <>
                      You can select a maximum of {MAX_BENCHMARKS} benchmarks for this collection.{' '}
                      <strong>
                        {remainingSelections} out of {MAX_BENCHMARKS} remaining
                      </strong>
                    </>
                  )}
                </HelperTextItem>
              </HelperText>
            </StackItem>
            <StackItem isFilled className="evalhub-copy-suite-benchmark-catalog__table-wrap">
              {paginatedBenchmarks.length === 0 ? (
                <Content component="p" data-testid="benchmark-catalog-empty">
                  {hasActiveFilters
                    ? 'No benchmarks match the filter criteria. Try adjusting or clearing your filters.'
                    : 'No benchmarks are currently available.'}
                </Content>
              ) : (
                <Table aria-label="Benchmark catalog" data-testid="benchmark-catalog-table">
                  <Thead>
                    <Tr>
                      <Th screenReaderText="Select benchmark" />
                      <Th>Benchmark</Th>
                      <Th>Category</Th>
                      <Th>Evaluates</Th>
                      <Th>Metrics</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {paginatedBenchmarks.map((benchmark) => (
                      <Tr
                        key={benchmark.key}
                        className={`evalhub-copy-suite-benchmark-catalog__row${
                          detailsBenchmarkKey === benchmark.key
                            ? ' evalhub-copy-suite-benchmark-catalog__row--active'
                            : ''
                        }`}
                        isClickable
                        isSelectable
                        isRowSelected={selected.has(benchmark.key)}
                        onRowClick={(event) => {
                          const target = event?.target;
                          if (target instanceof Element && target.closest('button, input, label')) {
                            return;
                          }
                          toggleSelection(benchmark.key);
                        }}
                      >
                        <Td>
                          <Checkbox
                            id={`benchmark-catalog-${benchmark.key}`}
                            data-testid={`benchmark-catalog-checkbox-${benchmark.id}`}
                            isChecked={selected.has(benchmark.key)}
                            isDisabled={
                              isInteractionDisabled ||
                              (isAtSelectionLimit && !selected.has(benchmark.key))
                            }
                            onChange={() => toggleSelection(benchmark.key)}
                            aria-label={`Select ${benchmark.name}`}
                          />
                        </Td>
                        <Td dataLabel="Benchmark">
                          <Button
                            variant="link"
                            isInline
                            className="evalhub-copy-suite-benchmark-catalog__benchmark-name"
                            data-testid={`benchmark-catalog-name-${benchmark.id}`}
                            onClick={() => {
                              trackEvalHubEvent(EVAL_HUB_EVENTS.BENCHMARK_DETAILS_VIEWED, {
                                source: 'suiteEditor',
                              });
                              setDetailsBenchmarkKey(benchmark.key);
                            }}
                          >
                            {benchmark.name}
                          </Button>
                          <Content
                            component="p"
                            className="evalhub-copy-suite-benchmark-catalog__benchmark-id"
                          >
                            {benchmark.framework}-{benchmark.id}
                          </Content>
                        </Td>
                        <Td dataLabel="Category">
                          {benchmark.category ? (
                            <Label color={getCategoryColor(benchmark.category)} isCompact>
                              {formatCategory(benchmark.category)}
                            </Label>
                          ) : null}
                        </Td>
                        <Td dataLabel="Evaluates">
                          {benchmark.targetTypes.length > 0 ? (
                            <LabelGroup isCompact>
                              {benchmark.targetTypes.map((targetType) => (
                                <Label key={targetType} isCompact>
                                  {formatCategory(targetType)}
                                </Label>
                              ))}
                            </LabelGroup>
                          ) : null}
                        </Td>
                        <Td dataLabel="Metrics">
                          <LabelGroup isCompact numLabels={3}>
                            {benchmark.metrics.map((metric) => (
                              <Label key={metric} isCompact variant="outline">
                                {getMetricDisplayName(metric)}
                              </Label>
                            ))}
                          </LabelGroup>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </StackItem>
            <StackItem>
              <Pagination
                itemCount={sortedBenchmarks.length}
                page={effectivePage}
                perPage={PAGE_SIZE}
                onSetPage={(_event, nextPage) => setPage(nextPage)}
                widgetId="benchmark-catalog-pagination-bottom"
                variant="bottom"
              />
            </StackItem>
          </Stack>
        </div>
      </fieldset>

      <div
        id="copy-suite-select-benchmarks-actions"
        className="evalhub-copy-suite-page__footer"
        data-testid="copy-suite-select-benchmarks-actions"
      >
        <Button
          variant="secondary"
          data-testid="copy-suite-back-select-benchmarks"
          onClick={onBack}
          isDisabled={isInteractionDisabled}
        >
          Back
        </Button>
        <Button
          variant="primary"
          data-testid="copy-suite-next-select-benchmarks"
          onClick={handleNext}
          isDisabled={isInteractionDisabled || !isSelectionCountValid}
        >
          Next
        </Button>
        <Button
          variant="link"
          data-testid="copy-suite-cancel-select-benchmarks"
          onClick={onCancel}
          isDisabled={isInteractionDisabled}
        >
          Cancel
        </Button>
      </div>

      {!isInteractionDisabled ? (
        <CopySuiteBenchmarkDetailsOverlay
          benchmark={detailsBenchmark}
          isOpen={!!detailsBenchmarkKey}
          onClose={() => setDetailsBenchmarkKey(undefined)}
          onPrimaryAction={() => {
            if (!detailsBenchmarkKey || (!isDetailsBenchmarkSelected && isAtSelectionLimit)) {
              return;
            }

            toggleSelection(detailsBenchmarkKey);
            setDetailsBenchmarkKey(undefined);
          }}
          primaryActionLabel={
            isDetailsBenchmarkSelected ? 'Deselect benchmark' : 'Select benchmark'
          }
        />
      ) : null}
    </div>
  );
};

export default CopySuiteBenchmarkSelectionStep;
