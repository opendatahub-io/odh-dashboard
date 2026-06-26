import * as React from 'react';
import {
  Button,
  Checkbox,
  EmptyStateVariant,
  MenuToggle,
  MenuToggleElement,
  Pagination,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { DashboardEmptyTableView } from '@odh-dashboard/ui-core';
import { FilterIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, ThProps } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import {
  fireMiscTrackingEvent,
  fireSimpleTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { EvaluationJob, EvaluationJobState } from '~/app/types';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import {
  getEvaluationName,
  getBenchmarkName,
  isEvaluationJobComparable,
} from '~/app/utilities/evaluationUtils';
import { CollectionNameMap } from '~/app/hooks/useCollectionNameMap';
import {
  buildDefaultComparableRunsFromJobs,
  buildMlflowCompareSearchParams,
  isBenchmarkSuiteRun,
} from '~/app/utilities/compareEvaluationsUtils';
import {
  DEFAULT_TABLE_PER_PAGE,
  TABLE_PER_PAGE_OPTIONS,
} from '~/app/utilities/tablePaginationConstants';
import { evaluationCompareBenchmarksRoute, evaluationCompareRoute } from '~/app/routes';
import EvaluationsTableRow from './EvaluationsTableRow';

type FilterOption = 'name' | 'evaluation' | 'evaluated' | 'status';

const FILTER_LABELS: Record<FilterOption, string> = {
  name: 'Evaluation name',
  evaluation: 'Evaluation',
  evaluated: 'Evaluated',
  status: 'Status',
};

const FILTER_PLACEHOLDERS: Partial<Record<FilterOption, string>> = {
  name: 'Filter by name',
  evaluation: 'Filter by evaluation',
  evaluated: 'Filter by evaluated',
};

const STATUS_OPTIONS: { value: EvaluationJobState; label: string }[] = [
  { value: 'cancelled', label: 'Canceled' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
  { value: 'running', label: 'Running' },
  { value: 'stopping', label: 'Canceling' },
];

type SortConfig = {
  index: number;
  direction: 'asc' | 'desc';
};

const getSortableValue = (job: EvaluationJob, columnIndex: number): string | number => {
  switch (columnIndex) {
    case 0:
      return getEvaluationName(job).toLowerCase();
    case 1:
      return job.status.state;
    case 4:
      return job.resource.created_at ? new Date(job.resource.created_at).getTime() : 0;
    default:
      return '';
  }
};

const getFilterValue = (
  job: EvaluationJob,
  filterType: FilterOption,
  collectionNames: Record<string, string>,
): string => {
  switch (filterType) {
    case 'name':
      return getEvaluationName(job).toLowerCase();
    case 'evaluation':
      return getBenchmarkName(job, collectionNames).toLowerCase();
    case 'evaluated':
      return job.model.name.toLowerCase();
    default:
      return '';
  }
};

type EvaluationsTableProps = {
  evaluations: EvaluationJob[];
  loaded: boolean;
  namespace?: string;
  collectionNameMap: CollectionNameMap;
  collectionsLoaded: boolean;
  onRefresh: () => void;
};

const EvaluationsTable: React.FC<EvaluationsTableProps> = ({
  evaluations,
  loaded,
  namespace,
  collectionNameMap,
  collectionsLoaded,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = React.useState<FilterOption>('name');
  const [filterValue, setFilterValue] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<EvaluationJobState | ''>('');
  const [isFilterSelectOpen, setIsFilterSelectOpen] = React.useState(false);
  const [isStatusSelectOpen, setIsStatusSelectOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(DEFAULT_TABLE_PER_PAGE);
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({
    index: 4,
    direction: 'desc',
  });
  const [selectedEvaluationIds, setSelectedEvaluationIds] = React.useState<Set<string>>(new Set());

  const filteredEvaluations = React.useMemo(
    () =>
      evaluations.filter((job) => {
        if (activeFilter === 'status') {
          if (!selectedStatus) {
            return true;
          }
          return job.status.state === selectedStatus;
        }
        if (!filterValue) {
          return true;
        }
        return getFilterValue(job, activeFilter, collectionNameMap).includes(
          filterValue.toLowerCase(),
        );
      }),
    [evaluations, filterValue, activeFilter, selectedStatus, collectionNameMap],
  );

  const sortedEvaluations = React.useMemo(() => {
    const sorted = [...filteredEvaluations].toSorted((a, b) => {
      const aVal = getSortableValue(a, sortConfig.index);
      const bVal = getSortableValue(b, sortConfig.index);
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return aVal - bVal;
      }
      return String(aVal).localeCompare(String(bVal));
    });
    return sortConfig.direction === 'desc' ? sorted.reverse() : sorted;
  }, [filteredEvaluations, sortConfig]);

  const paginatedEvaluations = React.useMemo(
    () => sortedEvaluations.slice(perPage * (page - 1), perPage * page),
    [sortedEvaluations, page, perPage],
  );

  const comparableEvaluationsInView = React.useMemo(
    () => paginatedEvaluations.filter(isEvaluationJobComparable),
    [paginatedEvaluations],
  );

  const selectedRowsInView = React.useMemo(
    () => comparableEvaluationsInView.filter((job) => selectedEvaluationIds.has(job.resource.id)),
    [comparableEvaluationsInView, selectedEvaluationIds],
  );

  const canCompare = selectedEvaluationIds.size >= 2;
  const allRowsInViewSelected =
    comparableEvaluationsInView.length > 0 &&
    selectedRowsInView.length === comparableEvaluationsInView.length;

  React.useEffect(() => {
    setSelectedEvaluationIds((prev) => {
      const comparableIds = new Set(
        evaluations.filter(isEvaluationJobComparable).map((job) => job.resource.id),
      );
      const next = new Set([...prev].filter((id) => comparableIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [evaluations]);

  React.useEffect(() => {
    setPage(1);
  }, [filterValue, activeFilter, selectedStatus]);

  const handleClearFilters = React.useCallback(() => {
    setFilterValue('');
    setSelectedStatus('');
  }, []);

  const handleSelectionChange = React.useCallback(
    (jobId: string, checked: boolean) => {
      setSelectedEvaluationIds((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(jobId);
        } else {
          next.delete(jobId);
        }

        const job = evaluations.find((j) => j.resource.id === jobId);
        if (job) {
          fireMiscTrackingEvent(EVAL_HUB_EVENTS.COMPARE_RUN_SELECTED, {
            evaluationName: getEvaluationName(job),
            evaluationType: isBenchmarkSuiteRun(job) ? 'Benchmark suite' : 'Benchmark',
            isSelected: checked,
            countOfRuns: next.size,
          });
        }

        return next;
      });
    },
    [evaluations],
  );

  const handleCompare = React.useCallback(() => {
    const selectedJobs = evaluations.filter((job) => selectedEvaluationIds.has(job.resource.id));
    if (selectedJobs.length < 2) {
      return;
    }

    const hasSuiteSelections = selectedJobs.some(isBenchmarkSuiteRun);
    const allSuites = selectedJobs.every(isBenchmarkSuiteRun);
    const allBenchmarks = selectedJobs.every((job) => !isBenchmarkSuiteRun(job));

    fireMiscTrackingEvent(EVAL_HUB_EVENTS.COMPARE_INITIATED, {
      countOfRuns: selectedJobs.length,
      runTypes: allBenchmarks ? 'all_benchmarks' : allSuites ? 'all_suites' : 'mixed',
      hasCollections: hasSuiteSelections,
    });

    const selectedJobIds = selectedJobs.map((job) => job.resource.id);

    if (hasSuiteSelections) {
      const search = new URLSearchParams();
      search.set('jobIds', selectedJobIds.join(','));
      navigate({
        pathname: evaluationCompareBenchmarksRoute(namespace),
        search: search.toString(),
      });
      return;
    }

    const selectedRuns = buildDefaultComparableRunsFromJobs(selectedJobs);

    if (selectedRuns.length < 2) {
      return;
    }

    const jobsById = new Map(selectedJobs.map((job) => [job.resource.id, job]));
    navigate({
      pathname: evaluationCompareRoute(namespace),
      search: buildMlflowCompareSearchParams(selectedRuns, (run) => {
        const job = jobsById.get(run.jobId);
        return job ? getEvaluationName(job) : run.jobId;
      }),
    });
  }, [evaluations, namespace, navigate, selectedEvaluationIds]);

  const getSortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: {
      index: sortConfig.index,
      direction: sortConfig.direction,
    },
    onSort: (_event, index, direction) => {
      setSortConfig({ index, direction });
    },
    columnIndex,
  });

  if (!loaded) {
    return null;
  }

  const hasFilters = filterValue.length > 0 || selectedStatus !== '';
  const isEmpty = filteredEvaluations.length === 0 && hasFilters;

  const filterToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setIsFilterSelectOpen((prev) => !prev)}
      isExpanded={isFilterSelectOpen}
      icon={<FilterIcon />}
      data-testid="filter-type-toggle"
    >
      {FILTER_LABELS[activeFilter]}
    </MenuToggle>
  );

  const statusToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setIsStatusSelectOpen((prev) => !prev)}
      isExpanded={isStatusSelectOpen}
      data-testid="filter-status-toggle"
    >
      {selectedStatus
        ? (STATUS_OPTIONS.find((o) => o.value === selectedStatus)?.label ?? 'Filter by status')
        : 'Filter by status'}
    </MenuToggle>
  );

  return (
    <>
      <Toolbar clearAllFilters={handleClearFilters} data-testid="evaluations-table-toolbar">
        <ToolbarContent>
          <ToolbarToggleGroup breakpoint="md" toggleIcon={<FilterIcon />}>
            <ToolbarGroup variant="filter-group">
              <ToolbarItem>
                <Select
                  isOpen={isFilterSelectOpen}
                  onSelect={(_event, value: string | number | undefined) => {
                    const key = String(value);
                    if (
                      key === 'name' ||
                      key === 'evaluation' ||
                      key === 'evaluated' ||
                      key === 'status'
                    ) {
                      setActiveFilter(key);
                    }
                    setFilterValue('');
                    setSelectedStatus('');
                    setIsFilterSelectOpen(false);
                  }}
                  onOpenChange={setIsFilterSelectOpen}
                  toggle={filterToggle}
                  data-testid="filter-type-select"
                >
                  <SelectList>
                    <SelectOption value="name" data-testid="filter-option-name">
                      Name
                    </SelectOption>
                    <SelectOption
                      value="evaluation"
                      isDisabled={!collectionsLoaded}
                      data-testid="filter-option-evaluation"
                    >
                      {collectionsLoaded ? 'Evaluation' : 'Evaluation (loading…)'}
                    </SelectOption>
                    <SelectOption value="evaluated" data-testid="filter-option-evaluated">
                      Evaluated
                    </SelectOption>
                    <SelectOption value="status" data-testid="filter-option-status">
                      Status
                    </SelectOption>
                  </SelectList>
                </Select>
              </ToolbarItem>
              <ToolbarItem>
                {activeFilter === 'status' ? (
                  <Select
                    isOpen={isStatusSelectOpen}
                    onSelect={(_event, value: string | number | undefined) => {
                      const matched = STATUS_OPTIONS.find((o) => o.value === String(value));
                      setSelectedStatus(matched ? matched.value : '');
                      setIsStatusSelectOpen(false);
                    }}
                    onOpenChange={setIsStatusSelectOpen}
                    toggle={statusToggle}
                    data-testid="filter-status-select"
                  >
                    <SelectList>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectOption
                          key={option.value}
                          value={option.value}
                          isSelected={selectedStatus === option.value}
                          data-testid={`filter-status-option-${option.value}`}
                        >
                          {option.label}
                        </SelectOption>
                      ))}
                    </SelectList>
                  </Select>
                ) : (
                  <SearchInput
                    aria-label={FILTER_PLACEHOLDERS[activeFilter] ?? ''}
                    placeholder={FILTER_PLACEHOLDERS[activeFilter] ?? ''}
                    value={filterValue}
                    onChange={(_event, value) => setFilterValue(value)}
                    onClear={() => setFilterValue('')}
                    data-testid="filter-toolbar-text-field"
                  />
                )}
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarToggleGroup>
          <ToolbarGroup>
            <ToolbarItem>
              <Button
                variant="primary"
                data-testid="create-evaluation-button"
                onClick={() => {
                  fireSimpleTrackingEvent(EVAL_HUB_EVENTS.START_EVALUATION_SELECTED);
                  navigate('create');
                }}
              >
                Start evaluation run
              </Button>
            </ToolbarItem>
            <ToolbarItem>
              <Button
                variant="secondary"
                data-testid="compare-evaluations-button"
                isDisabled={!canCompare}
                onClick={handleCompare}
              >
                Compare
              </Button>
            </ToolbarItem>
          </ToolbarGroup>
          <ToolbarItem variant="pagination" align={{ default: 'alignEnd' }}>
            <Pagination
              itemCount={filteredEvaluations.length}
              perPage={perPage}
              page={page}
              onSetPage={(_event, newPage) => setPage(newPage)}
              onPerPageSelect={(_event, newPerPage, newPage) => {
                setPerPage(newPerPage);
                setPage(newPage);
              }}
              perPageOptions={TABLE_PER_PAGE_OPTIONS}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {isEmpty ? (
        <DashboardEmptyTableView
          onClearFilters={handleClearFilters}
          variant={EmptyStateVariant.sm}
        />
      ) : (
        <Table aria-label="Evaluations table" data-testid="evaluations-table">
          <Thead>
            <Tr>
              <Th
                screenReaderText="Select evaluation row"
                data-testid="evaluations-select-all-header-cell"
              >
                <Checkbox
                  id="select-all-evaluation-rows"
                  aria-label="Select all evaluations on current page"
                  isChecked={allRowsInViewSelected}
                  isDisabled={comparableEvaluationsInView.length === 0}
                  onChange={(_event, checked) => {
                    setSelectedEvaluationIds((prev) => {
                      const next = new Set(prev);
                      if (checked) {
                        comparableEvaluationsInView.forEach((job) => next.add(job.resource.id));
                      } else {
                        comparableEvaluationsInView.forEach((job) => next.delete(job.resource.id));
                      }
                      return next;
                    });
                  }}
                  data-testid="select-all-evaluations-checkbox"
                />
              </Th>
              <Th sort={getSortParams(0)} modifier="nowrap">
                Name
              </Th>
              <Th sort={getSortParams(1)} modifier="nowrap">
                Status
              </Th>
              <Th
                modifier="nowrap"
                info={{
                  popover: 'The benchmark or benchmark suite used for this evaluation.',
                }}
              >
                Evaluation
              </Th>
              <Th
                modifier="nowrap"
                info={{
                  popover: 'The model, agent, or pre-recorded response being evaluated.',
                }}
              >
                Evaluated
              </Th>
              <Th sort={getSortParams(4)} modifier="nowrap">
                Date
              </Th>
              <Th
                modifier="nowrap"
                info={{
                  popover: "The normalized value of the benchmark's primary metric.",
                }}
              >
                Result
              </Th>
              <Th screenReaderText="Actions" />
            </Tr>
          </Thead>
          <Tbody>
            {paginatedEvaluations.map((job, rowIndex) => (
              <EvaluationsTableRow
                key={job.resource.id}
                job={job}
                rowIndex={rowIndex}
                namespace={namespace ?? ''}
                collectionNameMap={collectionNameMap}
                onActionComplete={onRefresh}
                isSelected={selectedEvaluationIds.has(job.resource.id)}
                onSelectionChange={(checked) => handleSelectionChange(job.resource.id, checked)}
              />
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );
};

export default EvaluationsTable;
