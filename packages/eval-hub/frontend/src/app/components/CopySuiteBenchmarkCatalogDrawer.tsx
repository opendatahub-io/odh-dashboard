import * as React from 'react';
import {
  Backdrop,
  Button,
  Checkbox,
  Content,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
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
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { createPortal } from 'react-dom';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import {
  capitalizeFirst,
  formatCategory,
  getCategoryColor,
  getMetricDisplayName,
} from '~/app/components/benchmarkUtils';
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
import { toggleBenchmarkSelectionKey } from '~/app/utilities/benchmarkDetailsUtils';
import type { Provider } from '~/app/types';
import './CopySuiteBenchmarkCatalogDrawer.scss';

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

type CopySuiteBenchmarkCatalogDrawerProps = {
  providers: Provider[];
  selectedBenchmarkKeys: string[];
  onSelectionChange: (selectedKeys: string[]) => void;
  onSave: (selectedKeys: string[]) => void;
  onClose: () => void;
  detailsBenchmarkKey?: string;
  onOpenDetails: (benchmarkKey: string) => void;
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

const CopySuiteBenchmarkCatalogDrawer: React.FC<CopySuiteBenchmarkCatalogDrawerProps> = ({
  providers,
  selectedBenchmarkKeys,
  onSelectionChange,
  onSave,
  onClose,
  detailsBenchmarkKey,
  onOpenDetails,
}) => {
  const selected = React.useMemo(() => new Set(selectedBenchmarkKeys), [selectedBenchmarkKeys]);
  const [filterData, setFilterData] = React.useState<BenchmarkFilterDataType>(
    initialBenchmarkFilterData,
  );
  const [page, setPage] = React.useState(1);

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
    () => sortBenchmarksByName(filteredBenchmarks),
    [filteredBenchmarks],
  );

  const paginatedBenchmarks = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedBenchmarks.slice(start, start + PAGE_SIZE);
  }, [sortedBenchmarks, page]);

  const remainingSelections = MAX_BENCHMARKS - selected.size;
  const isAtSelectionLimit = selected.size >= MAX_BENCHMARKS;
  const hasActiveFilters = hasActiveBenchmarkFilters(filterData);

  const onClearFilters = React.useCallback(() => {
    setFilterData(initialBenchmarkFilterData);
    setPage(1);
  }, []);

  const toggleSelection = React.useCallback(
    (key: string) => {
      onSelectionChange(toggleBenchmarkSelectionKey(selectedBenchmarkKeys, key, MAX_BENCHMARKS));
    },
    [onSelectionChange, selectedBenchmarkKeys],
  );

  const handleSave = React.useCallback(() => {
    if (selected.size === 0) {
      return;
    }
    onSave([...selected]);
    onClose();
  }, [onClose, onSave, selected]);

  React.useEffect(() => {
    document.body.classList.add('pf-v6-c-backdrop__open');
    return () => {
      document.body.classList.remove('pf-v6-c-backdrop__open');
    };
  }, []);

  const drawer = (
    <Backdrop data-testid="copy-suite-add-benchmarks-catalog-backdrop">
      <div className="evalhub-copy-suite-benchmark-catalog__host">
        <Drawer isExpanded isInline={false} data-testid="copy-suite-add-benchmarks-catalog-drawer">
          <DrawerContent
            id="copy-suite-add-benchmarks-catalog-drawer-content"
            onClick={onClose}
            panelContent={
              <DrawerPanelContent
                id="copy-suite-add-benchmarks-catalog-drawer-panel"
                className="evalhub-copy-suite-benchmark-catalog__panel"
                isResizable
                defaultSize="85%"
                minSize="60%"
                maxSize="100%"
                resizeAriaLabel="Resize benchmark catalog drawer"
              >
                <DrawerHead>
                  <Title headingLevel="h2" size="xl">
                    Add remove benchmarks
                  </Title>
                  <DrawerActions>
                    <DrawerCloseButton onClick={onClose} />
                  </DrawerActions>
                </DrawerHead>
                <DrawerPanelBody
                  id="copy-suite-add-benchmarks-catalog-body"
                  className="evalhub-copy-suite-benchmark-catalog__body"
                >
                  <Stack hasGutter>
                    <StackItem>
                      <Content component="p">
                        Select benchmarks to add to or remove from this suite.
                      </Content>
                    </StackItem>
                    <StackItem>
                      <Toolbar clearAllFilters={onClearFilters}>
                        <ToolbarContent>
                          <ToolbarToggleGroup
                            breakpoint="md"
                            toggleIcon={<FilterIcon aria-hidden />}
                          >
                            <ToolbarGroup
                              variant="filter-group"
                              data-testid="benchmark-catalog-filters"
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
                        </ToolbarContent>
                      </Toolbar>
                    </StackItem>
                    <StackItem>
                      <Pagination
                        itemCount={sortedBenchmarks.length}
                        page={page}
                        perPage={PAGE_SIZE}
                        onSetPage={(_event, nextPage) => setPage(nextPage)}
                        widgetId="benchmark-catalog-pagination-top"
                        isCompact
                      />
                    </StackItem>
                    <StackItem>
                      <HelperText>
                        <HelperTextItem data-testid="benchmark-catalog-limit-message">
                          You can select a maximum of {MAX_BENCHMARKS} benchmarks for this suite.{' '}
                          <strong>
                            {remainingSelections} out of {MAX_BENCHMARKS} remaining
                          </strong>
                        </HelperTextItem>
                      </HelperText>
                    </StackItem>
                    <StackItem
                      isFilled
                      className="evalhub-copy-suite-benchmark-catalog__table-wrap"
                    >
                      {paginatedBenchmarks.length === 0 ? (
                        <Content component="p" data-testid="benchmark-catalog-empty">
                          {hasActiveFilters
                            ? 'No benchmarks match the filter criteria. Try adjusting or clearing your filters.'
                            : 'No benchmarks are currently available.'}
                        </Content>
                      ) : (
                        <Table
                          aria-label="Benchmark catalog"
                          data-testid="benchmark-catalog-table"
                          variant="compact"
                        >
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
                                className={
                                  detailsBenchmarkKey === benchmark.key
                                    ? 'evalhub-copy-suite-benchmark-catalog__row--active'
                                    : undefined
                                }
                              >
                                <Td>
                                  <Checkbox
                                    id={`benchmark-catalog-${benchmark.key}`}
                                    data-testid={`benchmark-catalog-checkbox-${benchmark.id}`}
                                    isChecked={selected.has(benchmark.key)}
                                    isDisabled={isAtSelectionLimit && !selected.has(benchmark.key)}
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
                                    onClick={() => onOpenDetails(benchmark.key)}
                                  >
                                    {benchmark.name}
                                  </Button>
                                  <Content
                                    component="small"
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
                    <StackItem>
                      <div className="evalhub-copy-suite-benchmark-catalog__footer">
                        <Button
                          variant="primary"
                          data-testid="benchmark-catalog-save"
                          onClick={handleSave}
                          isDisabled={selected.size === 0}
                        >
                          Save
                        </Button>
                        <Button
                          variant="link"
                          data-testid="benchmark-catalog-cancel"
                          onClick={onClose}
                        >
                          Cancel
                        </Button>
                      </div>
                    </StackItem>
                  </Stack>
                </DrawerPanelBody>
              </DrawerPanelContent>
            }
          />
        </Drawer>
      </div>
    </Backdrop>
  );

  if (typeof document === 'undefined') {
    return drawer;
  }

  return createPortal(drawer, document.body);
};

export default CopySuiteBenchmarkCatalogDrawer;
