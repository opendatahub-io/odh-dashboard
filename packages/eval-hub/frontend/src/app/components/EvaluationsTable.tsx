import * as React from 'react';
import {
  Alert,
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
  Tooltip,
} from '@patternfly/react-core';
import { DashboardEmptyTableView } from '@odh-dashboard/ui-core';
import { FilterIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, ThProps } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { EvaluationJob, EvaluationJobState, KueueWorkloadStatus } from '~/app/types';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import {
  getEvaluationName,
  getBenchmarkName,
  getEvaluationDisplayState,
  getEvaluationQueue,
  isEvaluationJobQueued,
  isEvaluationJobComparable,
  isTerminalState,
} from '~/app/utilities/evaluationUtils';
import { isPreStartFailure } from '~/app/utilities/evaluationJobPolling';
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
import useEvaluationJobDetailPolling from '~/app/hooks/useEvaluationJobDetailPolling';
import { useKueueAvailability } from '~/app/hooks/useKueueAvailability';
import { useKueueWorkloadStatuses } from '~/app/hooks/useKueueWorkloadStatuses';
import usePageVisibility from '~/app/hooks/usePageVisibility';
import EvaluationsTableRow from './EvaluationsTableRow';

type FilterOption = 'name' | 'evaluation' | 'evaluated' | 'status';
type StatusFilter = Exclude<ReturnType<typeof getEvaluationDisplayState>, 'not_started'>;

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

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'admitted', label: 'Admitted' },
  { value: 'cancelled', label: 'Canceled' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
  { value: 'queued', label: 'Queued' },
  { value: 'running', label: 'Running' },
  { value: 'stopping', label: 'Canceling' },
];

const KUEUE_STATUS_FILTERS: StatusFilter[] = ['queued', 'admitted'];

const matchesStatusFilter = (
  job: EvaluationJob,
  selectedStatus: StatusFilter,
  kueueWorkloadStatus: KueueWorkloadStatus | undefined,
) => {
  const displayState = getEvaluationDisplayState(job.status.state, {
    isQueued: isEvaluationJobQueued(job),
    isPreStartFailure: isPreStartFailure(job),
    kueueWorkloadStatus,
  });
  if (selectedStatus === 'failed') {
    return displayState === 'failed' || displayState === 'not_started';
  }
  return displayState === selectedStatus;
};

type SortConfig = {
  index: number;
  direction: 'asc' | 'desc';
};

const getSortableValue = (
  job: EvaluationJob,
  columnIndex: number,
  dateColumnIndex: number,
  kueueWorkloadStatus: KueueWorkloadStatus | undefined,
): string | number => {
  switch (columnIndex) {
    case 0:
      return getEvaluationName(job).toLowerCase();
    case 1:
      return getEvaluationDisplayState(job.status.state, {
        isQueued: isEvaluationJobQueued(job),
        isPreStartFailure: isPreStartFailure(job),
        kueueWorkloadStatus,
      });
    case dateColumnIndex:
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
  onShowStatus: (job: EvaluationJob) => void;
};

const EvaluationsTable: React.FC<EvaluationsTableProps> = ({
  evaluations,
  loaded,
  namespace,
  collectionNameMap,
  collectionsLoaded,
  onRefresh,
  onShowStatus,
}) => {
  const navigate = useNavigate();
  const { availability: kueueAvailability, loaded: kueueAvailabilityLoaded } =
    useKueueAvailability(namespace);
  const isKueueSchedulingReady = kueueAvailability?.scheduling_ready === true;
  const hasQueueAssignments = React.useMemo(
    () => evaluations.some((job) => Boolean(getEvaluationQueue(job))),
    [evaluations],
  );
  const dateColumnIndex = hasQueueAssignments ? 5 : 4;
  const statusOptions = isKueueSchedulingReady
    ? STATUS_OPTIONS
    : STATUS_OPTIONS.filter((option) => !KUEUE_STATUS_FILTERS.includes(option.value));
  // Pause polling when the browser tab is backgrounded to reduce server load
  const isPollingEnabled = usePageVisibility();
  const evaluationIDs = React.useMemo(
    () => evaluations.map((job) => job.resource.id),
    [evaluations],
  );
  const isKueueWorkloadStatusPollingEnabled = loaded && isPollingEnabled;
  const {
    statusesByEvaluationId: kueueWorkloadStatusesByEvaluationID,
    isLoading: isKueueWorkloadStatusesLoading,
    error: kueueWorkloadStatusesError,
  } = useKueueWorkloadStatuses(
    namespace,
    evaluationIDs,
    isKueueSchedulingReady,
    isKueueWorkloadStatusPollingEnabled,
    evaluations.some((job) => !isTerminalState(job.status.state)),
  );
  const [activeFilter, setActiveFilter] = React.useState<FilterOption>('name');
  const [filterValue, setFilterValue] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<StatusFilter | ''>('');
  const [isFilterSelectOpen, setIsFilterSelectOpen] = React.useState(false);
  const [isStatusSelectOpen, setIsStatusSelectOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(DEFAULT_TABLE_PER_PAGE);
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({
    index: 5,
    direction: 'desc',
  });
  const [selectedEvaluationIds, setSelectedEvaluationIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    setSortConfig((previous) => {
      if (previous.index !== 4 && previous.index !== 5) {
        return previous;
      }
      return previous.index === dateColumnIndex
        ? previous
        : { ...previous, index: dateColumnIndex };
    });
    if (
      !isKueueSchedulingReady &&
      KUEUE_STATUS_FILTERS.some((status) => status === selectedStatus)
    ) {
      setSelectedStatus('');
    }
  }, [dateColumnIndex, isKueueSchedulingReady, selectedStatus]);

  const filteredEvaluations = React.useMemo(
    () =>
      evaluations.filter((job) => {
        if (activeFilter === 'status') {
          if (!selectedStatus) {
            return true;
          }
          return matchesStatusFilter(
            job,
            selectedStatus,
            kueueWorkloadStatusesByEvaluationID.get(job.resource.id),
          );
        }
        if (!filterValue) {
          return true;
        }
        return getFilterValue(job, activeFilter, collectionNameMap).includes(
          filterValue.toLowerCase(),
        );
      }),
    [
      evaluations,
      filterValue,
      activeFilter,
      selectedStatus,
      collectionNameMap,
      kueueWorkloadStatusesByEvaluationID,
    ],
  );

  const sortedEvaluations = React.useMemo(() => {
    const sorted = [...filteredEvaluations].toSorted((a, b) => {
      const aVal = getSortableValue(
        a,
        sortConfig.index,
        dateColumnIndex,
        kueueWorkloadStatusesByEvaluationID.get(a.resource.id),
      );
      const bVal = getSortableValue(
        b,
        sortConfig.index,
        dateColumnIndex,
        kueueWorkloadStatusesByEvaluationID.get(b.resource.id),
      );
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return aVal - bVal;
      }
      return String(aVal).localeCompare(String(bVal));
    });
    return sortConfig.direction === 'desc' ? sorted.reverse() : sorted;
  }, [dateColumnIndex, filteredEvaluations, kueueWorkloadStatusesByEvaluationID, sortConfig]);

  const paginatedEvaluations = React.useMemo(
    () => sortedEvaluations.slice(perPage * (page - 1), perPage * page),
    [sortedEvaluations, page, perPage],
  );

  const inProgressJobIds = React.useMemo(
    () =>
      paginatedEvaluations
        .filter((job) => !isTerminalState(job.status.state))
        .map((job) => job.resource.id),
    [paginatedEvaluations],
  );

  const { polledJobDataMap, isWarning } = useEvaluationJobDetailPolling(
    inProgressJobIds,
    namespace,
    loaded && isPollingEnabled,
  );

  // Trigger a list refresh as soon as polled data shows a job reaching a terminal state,
  // so the table updates immediately rather than waiting for the 30s list cycle.
  const prevPolledStatesRef = React.useRef<Map<string, EvaluationJobState>>(new Map());
  React.useEffect(() => {
    const hasTransition = Array.from(polledJobDataMap.entries()).some(([id, polledJob]) => {
      const prev = prevPolledStatesRef.current.get(id);
      // Treat undefined (first response) as non-terminal — the job was in inProgressJobIds
      return (
        (prev === undefined || !isTerminalState(prev)) && isTerminalState(polledJob.status.state)
      );
    });
    polledJobDataMap.forEach((polledJob, id) => {
      prevPolledStatesRef.current.set(id, polledJob.status.state);
    });
    for (const id of prevPolledStatesRef.current.keys()) {
      if (!polledJobDataMap.has(id)) {
        prevPolledStatesRef.current.delete(id);
      }
    }
    if (hasTransition) {
      onRefresh();
    }
  }, [polledJobDataMap, onRefresh]);

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
                      {statusOptions.map((option) => (
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
              <Tooltip
                content="Select at least 2 runs to compare"
                isVisible={!canCompare ? undefined : false}
              >
                <Button
                  variant="secondary"
                  data-testid="compare-evaluations-button"
                  isAriaDisabled={!canCompare}
                  onClick={canCompare ? handleCompare : undefined}
                >
                  Compare
                </Button>
              </Tooltip>
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

      {isWarning && (
        <Alert
          variant="warning"
          isInline
          title="Status updates are temporarily unavailable"
          data-testid="detail-polling-warning"
        />
      )}

      {isKueueSchedulingReady && kueueWorkloadStatusesError && (
        <Alert
          variant="warning"
          isInline
          title="Unable to load Kueue scheduling updates. Evaluation status is shown instead."
          data-testid="kueue-workload-status-warning"
        />
      )}

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
              {hasQueueAssignments && <Th modifier="nowrap">Queue</Th>}
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
                  popover: 'The model, agent, or dataset being evaluated.',
                }}
              >
                Evaluated
              </Th>
              <Th sort={getSortParams(dateColumnIndex)} modifier="nowrap">
                Date
              </Th>
              <Th
                modifier="nowrap"
                info={{
                  popover:
                    'The primary metric score for this evaluation run. For benchmark suites, this is the weighted average of all benchmark scores.',
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
                polledJobData={polledJobDataMap.get(job.resource.id)}
                rowIndex={rowIndex}
                namespace={namespace ?? ''}
                collectionNameMap={collectionNameMap}
                onActionComplete={onRefresh}
                onShowStatus={onShowStatus}
                isSelected={selectedEvaluationIds.has(job.resource.id)}
                onSelectionChange={(checked) => handleSelectionChange(job.resource.id, checked)}
                showQueue={hasQueueAssignments}
                kueueWorkloadStatus={kueueWorkloadStatusesByEvaluationID.get(job.resource.id)}
                isKueueWorkloadStatusLoading={
                  !kueueAvailabilityLoaded ||
                  (isKueueSchedulingReady && isKueueWorkloadStatusesLoading)
                }
              />
            ))}
          </Tbody>
        </Table>
      )}
    </>
  );
};

export default EvaluationsTable;
