import * as React from 'react';
import {
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
  capitalizeFirst,
  formatCategory,
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
  getAvailableFrameworks,
  getAvailableMetrics,
  hasActiveBenchmarkFilters,
  sortBenchmarksByName,
} from '~/app/utilities/benchmarkListFilters';
import {
  buildFlatBenchmarkByKey,
  toggleBenchmarkSelectionKey,
} from '~/app/utilities/benchmarkDetailsUtils';
import type { FlatBenchmark, Provider } from '~/app/types';

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
  isInteractionDisabled?: boolean;
  onNext: (selectedKeys: string[]) => void;
  onBack: () => void;
  onCancel: () => void;
};

const getTargetTypes = (provider: Provider): string[] => {
  if (provider.agent?.evaluates?.length) {
    return provider.agent.evaluates;
  }
  if (provider.agent?.target_type) {
    return [provider.agent.target_type];
  }
  return ['model'];
};

const CopySuiteBenchmarkSelectionStep: React.FC<CopySuiteBenchmarkSelectionStepProps> = ({
  providers,
  selectedBenchmarkKeys,
  isInteractionDisabled = false,
  onNext,
  onBack,
  onCancel,
}) => {
  const [draftSelectedBenchmarkKeys, setDraftSelectedBenchmarkKeys] =
    React.useState(selectedBenchmarkKeys);
  const [filterData, setFilterData] = React.useState<BenchmarkFilterDataType>(
    initialBenchmarkFilterData,
  );
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
      const targetTypes = getTargetTypes(provider);

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
  const availableFrameworks = React.useMemo(
    () => getAvailableFrameworks(catalogBenchmarks),
    [catalogBenchmarks],
  );
  const availableMetrics = React.useMemo(
    () => getAvailableMetrics(catalogBenchmarks),
    [catalogBenchmarks],
  );
  const filteredBenchmarks = React.useMemo(
    () => filterBenchmarks(catalogBenchmarks, filterData),
    [catalogBenchmarks, filterData],
  );
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
  const paginatedBenchmarks = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedBenchmarks.slice(start, start + PAGE_SIZE);
  }, [sortedBenchmarks, page]);

  const remainingSelections = MAX_BENCHMARKS - selected.size;
  const isAtSelectionLimit = selected.size >= MAX_BENCHMARKS;
  const hasActiveFilters = hasActiveBenchmarkFilters(filterData);
  const flatBenchmarkByKey = React.useMemo(() => buildFlatBenchmarkByKey(providers), [providers]);
  const detailsBenchmark: FlatBenchmark | undefined = detailsBenchmarkKey
    ? flatBenchmarkByKey.get(detailsBenchmarkKey)
    : undefined;
  const isDetailsBenchmarkSelected = detailsBenchmarkKey
    ? selected.has(detailsBenchmarkKey)
    : false;

  const onClearFilters = React.useCallback(() => {
    setFilterData(initialBenchmarkFilterData);
    setPage(1);
  }, []);

  const toggleSelection = React.useCallback((key: string) => {
    setPage(1);
    setDraftSelectedBenchmarkKeys((currentKeys) =>
      toggleBenchmarkSelectionKey(currentKeys, key, MAX_BENCHMARKS),
    );
  }, []);

  const handleNext = React.useCallback(() => {
    if (draftSelectedBenchmarkKeys.length > 0 && !isInteractionDisabled) {
      onNext([...draftSelectedBenchmarkKeys]);
    }
  }, [draftSelectedBenchmarkKeys, isInteractionDisabled, onNext]);

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
          <Content component="h2">Select benchmarks</Content>
          <Content component="p">
            Search and select up to {MAX_BENCHMARKS} benchmarks to include in your suite.
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
                        deleteLabel={() =>
                          setFilterData((prev) => ({
                            ...prev,
                            [BenchmarkFilterOptions.name]: '',
                          }))
                        }
                        categoryName="Search"
                      >
                        <SearchInput
                          aria-label="Search benchmarks"
                          placeholder="Search benchmarks"
                          value={filterData[BenchmarkFilterOptions.name]}
                          onChange={(_event, value) => {
                            setFilterData((prev) => ({
                              ...prev,
                              [BenchmarkFilterOptions.name]: value,
                            }));
                            setPage(1);
                          }}
                          onClear={() => {
                            setFilterData((prev) => ({
                              ...prev,
                              [BenchmarkFilterOptions.name]: '',
                            }));
                            setPage(1);
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
                          setFilterData((prev) => ({
                            ...prev,
                            [BenchmarkFilterOptions.category]: prev[
                              BenchmarkFilterOptions.category
                            ].includes(value)
                              ? prev[BenchmarkFilterOptions.category].filter(
                                  (item) => item !== value,
                                )
                              : [...prev[BenchmarkFilterOptions.category], value],
                          }));
                          setPage(1);
                        }}
                        onClearAll={() => {
                          setFilterData((prev) => ({
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
                          setFilterData((prev) => ({
                            ...prev,
                            [BenchmarkFilterOptions.framework]: prev[
                              BenchmarkFilterOptions.framework
                            ].includes(value)
                              ? prev[BenchmarkFilterOptions.framework].filter(
                                  (item) => item !== value,
                                )
                              : [...prev[BenchmarkFilterOptions.framework], value],
                          }));
                          setPage(1);
                        }}
                        onClearAll={() => {
                          setFilterData((prev) => ({
                            ...prev,
                            [BenchmarkFilterOptions.framework]: [],
                          }));
                          setPage(1);
                        }}
                        testIdPrefix="benchmark-catalog-framework"
                      />
                      <SearchableMultiSelectFilter
                        categoryName="Metrics"
                        options={availableMetrics}
                        selected={filterData[BenchmarkFilterOptions.metrics]}
                        formatLabel={getMetricDisplayName}
                        onToggleOption={(value) => {
                          setFilterData((prev) => ({
                            ...prev,
                            [BenchmarkFilterOptions.metrics]: prev[
                              BenchmarkFilterOptions.metrics
                            ].includes(value)
                              ? prev[BenchmarkFilterOptions.metrics].filter(
                                  (item) => item !== value,
                                )
                              : [...prev[BenchmarkFilterOptions.metrics], value],
                          }));
                          setPage(1);
                        }}
                        onClearAll={() => {
                          setFilterData((prev) => ({
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
                      page={page}
                      perPage={PAGE_SIZE}
                      onSetPage={(_event, nextPage) => setPage(nextPage)}
                      widgetId="benchmark-catalog-pagination-top"
                      variant="top"
                      isCompact
                    />
                  </ToolbarItem>
                </ToolbarContent>
              </Toolbar>
            </StackItem>
            <StackItem>
              <HelperText>
                <HelperTextItem
                  className="evalhub-copy-suite-benchmark-catalog__limit-message"
                  data-testid="benchmark-catalog-limit-message"
                >
                  You can select a maximum of {MAX_BENCHMARKS} benchmarks for this suite.{' '}
                  <strong>
                    {remainingSelections} out of {MAX_BENCHMARKS} remaining
                  </strong>
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
                      <Th>Target type</Th>
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
                            onClick={() => setDetailsBenchmarkKey(benchmark.key)}
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
                        <Td dataLabel="Target type">
                          <LabelGroup isCompact>
                            {benchmark.targetTypes.map((targetType) => (
                              <Label key={targetType} isCompact>
                                {capitalizeFirst(targetType)}
                              </Label>
                            ))}
                          </LabelGroup>
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
                page={page}
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
          isDisabled={isInteractionDisabled || draftSelectedBenchmarkKeys.length === 0}
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
            if (detailsBenchmarkKey) {
              toggleSelection(detailsBenchmarkKey);
            }
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
