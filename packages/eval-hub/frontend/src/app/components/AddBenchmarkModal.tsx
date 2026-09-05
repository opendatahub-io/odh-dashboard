import * as React from 'react';
import {
  Button,
  Checkbox,
  Content,
  HelperText,
  HelperTextItem,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { FilterIcon, SortAmountDownIcon } from '@patternfly/react-icons';
import { formatCategory, getMetricDisplayName } from '~/app/components/benchmarkUtils';
import SearchableMultiSelectFilter from '~/app/components/SearchableMultiSelectFilter';
import {
  BenchmarkFilterDataType,
  BenchmarkFilterOptions,
  BenchmarkSortOption,
  benchmarkSortLabels,
  initialBenchmarkFilterData,
} from '~/app/pages/const';
import type { CopySuiteBenchmark } from '~/app/pages/useCopySuiteForm';
import {
  filterBenchmarks,
  getAvailableCategories,
  getAvailableMetrics,
  hasActiveBenchmarkFilters,
  isBenchmarkSortOption,
  sortBenchmarks,
} from '~/app/utilities/benchmarkListFilters';
import { normalizeThreshold } from '~/app/utilities/evaluationUtils';
import type { Provider } from '~/app/types';
import './AddBenchmarkModal.scss';

type AddBenchmarkModalProps = {
  providers: Provider[];
  existingBenchmarkIds: Set<string>;
  maxNewBenchmarks: number;
  onAdd: (benchmarks: CopySuiteBenchmark[]) => void;
  onClose: () => void;
};

type AvailableBenchmark = {
  key: string;
  providerId: string;
  providerName: string;
  id: string;
  name: string;
  category?: string;
  metrics: string[];
  primaryMetric?: string;
  lowerIsBetter?: boolean;
  threshold: number;
  datasetSize?: number;
  numFewShot?: number;
};

const DEFAULT_THRESHOLD = 70;

const AddBenchmarkModal: React.FC<AddBenchmarkModalProps> = ({
  providers,
  existingBenchmarkIds,
  maxNewBenchmarks,
  onAdd,
  onClose,
}) => {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [filterData, setFilterData] = React.useState<BenchmarkFilterDataType>(
    initialBenchmarkFilterData,
  );
  const [sortOption, setSortOption] = React.useState(BenchmarkSortOption.DEFAULT);
  const [isSortOpen, setIsSortOpen] = React.useState(false);

  const availableBenchmarks = React.useMemo<AvailableBenchmark[]>(() => {
    const benchmarks: AvailableBenchmark[] = [];

    providers.forEach((provider) => {
      (provider.benchmarks ?? []).forEach((pb) => {
        const key = `${provider.resource.id}:${pb.id}`;
        if (existingBenchmarkIds.has(key)) {
          return;
        }

        benchmarks.push({
          key,
          providerId: provider.resource.id,
          providerName: provider.title ?? provider.name,
          id: pb.id,
          name: pb.name || pb.id,
          category: pb.category,
          metrics: pb.metrics ?? [],
          primaryMetric: pb.primary_score?.metric,
          lowerIsBetter: pb.primary_score?.lower_is_better,
          threshold: pb.pass_criteria
            ? normalizeThreshold(pb.pass_criteria.threshold)
            : DEFAULT_THRESHOLD,
          datasetSize: pb.dataset_size,
          numFewShot: pb.num_few_shot,
        });
      });
    });

    return benchmarks;
  }, [providers, existingBenchmarkIds]);

  const availableCategories = React.useMemo(
    () => getAvailableCategories(availableBenchmarks),
    [availableBenchmarks],
  );

  const availableMetrics = React.useMemo(
    () => getAvailableMetrics(availableBenchmarks),
    [availableBenchmarks],
  );

  const onClearFilters = React.useCallback(() => setFilterData(initialBenchmarkFilterData), []);

  const filteredBenchmarks = React.useMemo(
    () => filterBenchmarks(availableBenchmarks, filterData),
    [availableBenchmarks, filterData],
  );

  const sortedBenchmarks = React.useMemo(
    () => sortBenchmarks(filteredBenchmarks, sortOption),
    [filteredBenchmarks, sortOption],
  );

  const hasActiveFilters = hasActiveBenchmarkFilters(filterData);

  const isAtSelectionLimit = selected.size >= maxNewBenchmarks;

  const toggleSelection = React.useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleAdd = React.useCallback(() => {
    const newBenchmarks: CopySuiteBenchmark[] = availableBenchmarks
      .filter((b) => selected.has(b.key))
      .map((b) => ({
        id: b.id,
        providerId: b.providerId,
        name: b.name,
        weight: 1,
        primaryMetric: b.primaryMetric ?? b.metrics[0],
        lowerIsBetter: b.lowerIsBetter,
        numSamples: b.datasetSize,
        datasetSize: b.datasetSize,
        numFewShot: b.numFewShot,
        threshold: b.threshold,
        availableMetrics: b.metrics,
      }));

    if (newBenchmarks.length > 0) {
      onAdd(newBenchmarks);
    }
  }, [availableBenchmarks, selected, onAdd]);

  return (
    <Modal isOpen onClose={onClose} variant="medium" data-testid="add-benchmark-modal">
      <ModalHeader title="Add benchmarks" />
      <ModalBody className="evalhub-add-benchmark-modal__body">
        <div className="evalhub-add-benchmark-modal__controls">
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
                      data-testid="add-benchmark-sort-toggle"
                    >
                      {benchmarkSortLabels[sortOption]}
                    </MenuToggle>
                  )}
                  data-testid="add-benchmark-sort-select"
                >
                  <SelectList>
                    {Object.values(BenchmarkSortOption).map((opt) => (
                      <SelectOption
                        key={opt}
                        value={opt}
                        isSelected={sortOption === opt}
                        data-testid={`add-benchmark-sort-option-${opt}`}
                      >
                        {benchmarkSortLabels[opt]}
                      </SelectOption>
                    ))}
                  </SelectList>
                </Select>
              </ToolbarItem>
              <ToolbarToggleGroup breakpoint="md" toggleIcon={<FilterIcon />}>
                <ToolbarGroup variant="filter-group" data-testid="add-benchmark-filter-toolbar">
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
                    categoryName="Name or ID"
                  >
                    <SearchInput
                      aria-label="Filter by name or ID"
                      placeholder="Filter by name or ID"
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
                      data-testid="add-benchmark-filter"
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
                          ? prev[BenchmarkFilterOptions.category].filter((c) => c !== value)
                          : [...prev[BenchmarkFilterOptions.category], value],
                      }))
                    }
                    onClearAll={() =>
                      setFilterData((prev) => ({
                        ...prev,
                        [BenchmarkFilterOptions.category]: [],
                      }))
                    }
                    testIdPrefix="add-benchmark-category"
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
                          ? prev[BenchmarkFilterOptions.metrics].filter((m) => m !== value)
                          : [...prev[BenchmarkFilterOptions.metrics], value],
                      }))
                    }
                    onClearAll={() =>
                      setFilterData((prev) => ({
                        ...prev,
                        [BenchmarkFilterOptions.metrics]: [],
                      }))
                    }
                    testIdPrefix="add-benchmark-metrics"
                  />
                </ToolbarGroup>
              </ToolbarToggleGroup>
            </ToolbarContent>
          </Toolbar>
          {isAtSelectionLimit && (
            <HelperText>
              <HelperTextItem variant="warning" data-testid="add-benchmark-limit-warning">
                You can only add {maxNewBenchmarks} more benchmark
                {maxNewBenchmarks === 1 ? '' : 's'}. Deselect one to choose a different benchmark.
              </HelperTextItem>
            </HelperText>
          )}
        </div>
        <div className="evalhub-add-benchmark-modal__list" data-testid="add-benchmark-list">
          {sortedBenchmarks.length === 0 ? (
            <Content component="p" data-testid="no-available-benchmarks">
              {availableBenchmarks.length === 0
                ? 'All available benchmarks have already been added.'
                : hasActiveFilters
                  ? 'No benchmarks match the filter criteria. Try adjusting or clearing your filters.'
                  : 'No benchmarks available to add.'}
            </Content>
          ) : (
            <Stack hasGutter>
              {sortedBenchmarks.map((b) => (
                <StackItem key={b.key}>
                  <Checkbox
                    id={`add-benchmark-${b.key}`}
                    data-testid={`add-benchmark-checkbox-${b.id}`}
                    label={
                      <>
                        <strong>{b.name}</strong>
                        <Content
                          component="small"
                          className="evalhub-add-benchmark-modal__benchmark-details"
                        >
                          {b.providerName} &middot; {b.id}
                        </Content>
                      </>
                    }
                    isChecked={selected.has(b.key)}
                    isDisabled={isAtSelectionLimit && !selected.has(b.key)}
                    onChange={() => toggleSelection(b.key)}
                  />
                </StackItem>
              ))}
            </Stack>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          data-testid="add-benchmark-confirm"
          onClick={handleAdd}
          isDisabled={selected.size === 0}
        >
          Add selected ({selected.size})
        </Button>
        <Button variant="link" data-testid="add-benchmark-cancel" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AddBenchmarkModal;
