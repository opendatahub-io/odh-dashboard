import React from 'react';
import { Link } from 'react-router-dom';

import { Button, Skeleton, Tooltip } from '@patternfly/react-core';
import { TableVariant, Td } from '@patternfly/react-table';
import { ColumnsIcon } from '@patternfly/react-icons';

import {
  DashboardEmptyTableView,
  getTableColumnSort,
  TableBase,
  TrackingOutcome,
} from '@odh-dashboard/ui-core';
import { useCheckboxTable } from '#~/components/table';
import { ExperimentKF, PipelineRunKF, StorageStateKF } from '#~/concepts/pipelines/kfTypes';
import { getPipelineRunColumns } from '#~/concepts/pipelines/content/tables/columns';
import useIsMlflowPipelinesAvailable from '#~/concepts/mlflow/hooks/useIsMlflowPipelinesAvailable';
import PipelineRunTableRow from '#~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRow';
import PipelineRunTableToolbar from '#~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableToolbar';
import DeletePipelineRunsModal from '#~/concepts/pipelines/content/DeletePipelineRunsModal';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { PipelineRunType } from '#~/pages/pipelines/global/runs/types';
import { PipelinesFilter } from '#~/concepts/pipelines/types';
import {
  FilterOptions,
  getDataValue,
  usePipelineFilterSearchParams,
} from '#~/concepts/pipelines/content/tables/usePipelineFilter';
import SimpleMenuActions from '#~/components/SimpleMenuActions';
import { ArchiveRunModal } from '#~/pages/pipelines/global/runs/ArchiveRunModal';
import { RestoreRunModal } from '#~/pages/pipelines/global/runs/RestoreRunModal';
import { compareRunsRoute, createRunRoute } from '#~/routes/pipelines/runs';
import { mlflowCompareRunsRoute } from '#~/routes/pipelines/mlflow';
import {
  ExperimentContext,
  useContextExperimentArchivedOrDeleted,
} from '#~/pages/pipelines/global/experiments/ExperimentContext';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { PipelineRunExperimentsContext } from '#~/pages/pipelines/global/runs/PipelineRunExperimentsContext';
import RestoreRunWithArchivedExperimentModal from '#~/pages/pipelines/global/runs/RestoreRunWithArchivedExperimentModal';
import useMlflowExperiments from '#~/concepts/mlflow/hooks/useMlflowExperiments';
import { useMlmdContextsByType } from '#~/concepts/pipelines/apiHooks/mlmd/useMlmdContextsByType';
import { MlmdContextTypes } from '#~/concepts/pipelines/apiHooks/mlmd/types';
import { useGetExecutionsByRuns } from '#~/concepts/pipelines/apiHooks/mlmd/useGetExecutionsByRuns';
import { CustomMetricsColumnsModal } from './CustomMetricsColumnsModal';
import { UnavailableMetricValue } from './UnavailableMetricValue';
import { useMetricColumns } from './useMetricColumns';
import {
  extractMlflowNestedRuns,
  filterByMlflowExperiment,
  getMlflowExperimentId,
  getMlflowRunId,
} from './utils';
import { MlflowNestedRun } from './types';

const emptyRuns: PipelineRunKF[] = [];

type PipelineRunTableProps = {
  runs: PipelineRunKF[];
  loading?: boolean;
  totalSize: number;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  setSortField: (field: string) => void;
  setSortDirection: (dir: 'asc' | 'desc') => void;
  setFilter: (filter?: PipelinesFilter) => void;
  runType: PipelineRunType.ACTIVE | PipelineRunType.ARCHIVED;
};

const PipelineRunTable: React.FC<PipelineRunTableProps> = ({
  runs: runWithoutMetrics,
  loading,
  totalSize,
  page,
  pageSize,
  runType,
  setPage,
  setPageSize,
  setFilter,
  ...tableProps
}) => {
  const { experiment } = React.useContext(ExperimentContext);
  const { experiments: allExperiments } = React.useContext(PipelineRunExperimentsContext);
  const { available: isMlflowAvailable } = useIsMlflowPipelinesAvailable();
  const { namespace, refreshAllAPI } = usePipelinesAPI();
  const {
    data: mlflowExperiments,
    loaded: mlflowExperimentsLoaded,
    error: mlflowExperimentsError,
  } = useMlflowExperiments({
    workspace: isMlflowAvailable ? namespace : '',
  });
  const { onClearFilters, ...filterToolbarProps } = usePipelineFilterSearchParams(setFilter);
  const [contexts, , contextsError] = useMlmdContextsByType(MlmdContextTypes.RUN);
  const {
    metricsColumnNames,
    runs: runsWithMetrics,
    runArtifactsError,
    runArtifactsLoaded,
  } = useMetricColumns(runWithoutMetrics, contexts, experiment?.experiment_id);
  const [runExecutions, runExecutionsLoaded] = useGetExecutionsByRuns(
    isMlflowAvailable ? runWithoutMetrics : emptyRuns,
    contexts,
  );
  const nestedRunsByRunId = React.useMemo<Partial<Record<string, MlflowNestedRun[]>>>(() => {
    if (!runExecutionsLoaded) {
      return {};
    }
    const result: Partial<Record<string, MlflowNestedRun[]>> = {};
    runExecutions.forEach((executionMap) => {
      Object.entries(executionMap).forEach(([runId, executions]) => {
        const run = runWithoutMetrics.find((r) => r.run_id === runId);
        const rootMlflowRunId = run ? getMlflowRunId(run) : undefined;
        const nested = extractMlflowNestedRuns(executions, rootMlflowRunId);
        if (nested.length) {
          result[runId] = nested;
        }
      });
    });
    return result;
  }, [runExecutions, runExecutionsLoaded, runWithoutMetrics]);

  const mlflowFilter = getDataValue(filterToolbarProps.filterData[FilterOptions.MLFLOW_EXPERIMENT]);
  const runs = React.useMemo(
    () => filterByMlflowExperiment(runsWithMetrics, mlflowFilter),
    [runsWithMetrics, mlflowFilter],
  );
  const effectiveTotalSize = mlflowFilter ? runs.length : totalSize;

  const visibleMetricsNames = React.useMemo(() => {
    const names = new Set<string>();
    runs.forEach((run) => {
      run.metrics.forEach((metric) => names.add(metric.name));
    });
    return names;
  }, [runs]);

  const visibleMetricsColumnNames = React.useMemo(
    () => metricsColumnNames.filter((name) => visibleMetricsNames.has(name)),
    [metricsColumnNames, visibleMetricsNames],
  );
  const hasMetrics = visibleMetricsColumnNames.length > 0 || visibleMetricsNames.size > 0;
  const {
    selections: selectedIds,
    tableProps: checkboxTableProps,
    toggleSelection,
    isSelected,
    setSelections: setSelectedIds,
  } = useCheckboxTable(runs.map(({ run_id: runId }) => runId));
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = React.useState(false);
  const [isCustomColModalOpen, setIsCustomColModalOpen] = React.useState(false);
  const selectedRuns = React.useMemo(
    () =>
      selectedIds.reduce((acc: PipelineRunKF[], selectedId) => {
        const selectedRun = runs.find((run) => run.run_id === selectedId);
        if (selectedRun) {
          acc.push(selectedRun);
        }
        return acc;
      }, []),
    [selectedIds, runs],
  );
  const restoreButtonTooltipRef = React.useRef(null);
  const archivedExperiments = selectedRuns.reduce<ExperimentKF[]>((acc, selectedRun) => {
    const currentExperiment = allExperiments.find(
      (e) => e.experiment_id === selectedRun.experiment_id,
    );

    if (currentExperiment && currentExperiment.storage_state === StorageStateKF.ARCHIVED) {
      if (
        !acc.some(
          (selectedExperiment) =>
            selectedExperiment.experiment_id === currentExperiment.experiment_id,
        )
      ) {
        acc.push(currentExperiment);
      }
    }

    return acc;
  }, []);

  const { isExperimentArchived: isContextExperimentArchived } =
    useContextExperimentArchivedOrDeleted();
  const createRunHref = createRunRoute(namespace, experiment?.experiment_id);
  const hasSelectedRuns = selectedIds.length > 0;

  const { compareRunsHref, isCompareDisabled, compareTooltip } = React.useMemo(() => {
    const rootRunIds = selectedRuns.map(getMlflowRunId).filter((id): id is string => !!id);
    const validExpIds = selectedRuns.map(getMlflowExperimentId).filter((id): id is string => !!id);
    const allHaveMlflow =
      hasSelectedRuns &&
      rootRunIds.length === selectedIds.length &&
      validExpIds.length === selectedIds.length;
    if (isMlflowAvailable && allHaveMlflow) {
      const nestedRunIds = selectedRuns.flatMap(
        (run) => nestedRunsByRunId[run.run_id]?.map((n) => n.mlflowRunId) ?? [],
      );
      const allRunIds = [...rootRunIds, ...nestedRunIds];
      const disabled = allRunIds.length > 10;
      return {
        compareRunsHref: mlflowCompareRunsRoute(namespace, allRunIds, [...new Set(validExpIds)]),
        isCompareDisabled: disabled,
        compareTooltip: disabled
          ? `Too many MLflow runs to compare (${allRunIds.length} total, including nested runs). Select fewer runs to stay within the 10-run limit.`
          : 'Select up to 10 runs to compare.',
      };
    }
    return {
      compareRunsHref: compareRunsRoute(namespace, selectedIds, experiment?.experiment_id),
      isCompareDisabled: !hasSelectedRuns || selectedIds.length > 10,
      compareTooltip: 'Select up to 10 runs to compare.',
    };
  }, [
    selectedRuns,
    selectedIds,
    hasSelectedRuns,
    isMlflowAvailable,
    nestedRunsByRunId,
    namespace,
    experiment?.experiment_id,
  ]);
  const primaryToolbarAction = React.useMemo(() => {
    if (runType === PipelineRunType.ARCHIVED) {
      return (
        <>
          {isContextExperimentArchived && (
            <Tooltip
              content="Archived runs cannot be restored until its associated experiment is restored."
              triggerRef={restoreButtonTooltipRef}
            />
          )}
          <Button
            data-testid="restore-button"
            variant="primary"
            isDisabled={!selectedIds.length}
            isAriaDisabled={isContextExperimentArchived}
            onClick={() => setIsRestoreModalOpen(true)}
            ref={restoreButtonTooltipRef}
          >
            Restore
          </Button>
        </>
      );
    }

    return (
      <Button
        key="create-run"
        data-testid="create-run-button"
        variant="primary"
        component={(props: React.ComponentProps<'a'>) => <Link {...props} to={createRunHref} />}
      >
        Create run
      </Button>
    );
  }, [runType, isContextExperimentArchived, selectedIds.length, createRunHref]);

  const compareRunsAction =
    !isContextExperimentArchived && runType === PipelineRunType.ACTIVE ? (
      <Tooltip content={compareTooltip}>
        <Button
          key="compare-runs"
          data-testid="compare-runs-button"
          variant="secondary"
          isAriaDisabled={isCompareDisabled}
          {...(!isCompareDisabled && {
            component: (props: React.ComponentProps<'a'>) => (
              <Link {...props} to={compareRunsHref} />
            ),
          })}
        >
          Compare runs
        </Button>
      </Tooltip>
    ) : null;

  const toolbarDropdownAction = (
    <SimpleMenuActions
      key="run-table-toolbar-actions"
      testId="run-table-toolbar-actions"
      dropdownItems={[
        ...(runType === PipelineRunType.ARCHIVED
          ? [
              {
                key: 'delete',
                label: 'Delete',
                onClick: () => setIsDeleteModalOpen(true),
                isDisabled: !selectedIds.length,
              },
            ]
          : [
              {
                key: 'archive',
                label: 'Archive',
                onClick: () => setIsArchiveModalOpen(true),
                isDisabled: !selectedIds.length,
              },
            ]),
      ]}
    />
  );

  const columns = experiment
    ? getPipelineRunColumns(visibleMetricsColumnNames, isMlflowAvailable).filter(
        (column) => column.field !== 'run_group',
      )
    : getPipelineRunColumns(visibleMetricsColumnNames, isMlflowAvailable);

  return (
    <>
      <TableBase
        {...checkboxTableProps}
        hasStickyColumns
        loading={loading}
        page={page}
        perPage={pageSize}
        onSetPage={(_, newPage) => {
          if (newPage < page || !loading) {
            setPage(newPage);
          }
        }}
        onPerPageSelect={(_, newSize) => setPageSize(newSize)}
        itemCount={effectiveTotalSize}
        data={runs}
        columns={columns}
        enablePagination="compact"
        emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
        onClearFilters={onClearFilters}
        toolbarContent={
          <PipelineRunTableToolbar
            data-testid={`${runType}-runs-table-toolbar`}
            {...filterToolbarProps}
            actions={[
              primaryToolbarAction,
              ...(compareRunsAction ? [compareRunsAction] : []),
              toolbarDropdownAction,
              [
                <Tooltip
                  key="custom-metrics-columns"
                  content={
                    !runArtifactsLoaded
                      ? 'Customize metrics columns: Loading metrics...'
                      : !hasMetrics
                      ? 'Customize metrics columns: No metrics available'
                      : 'Customize metrics columns'
                  }
                >
                  <Button
                    variant="plain"
                    aria-label="Customize metrics column button"
                    isAriaDisabled={!runArtifactsLoaded || !hasMetrics}
                    onClick={() => setIsCustomColModalOpen(true)}
                    icon={<ColumnsIcon />}
                  />
                </Tooltip>,
              ],
            ]}
          />
        }
        rowRenderer={(run) => (
          <PipelineRunTableRow
            key={run.run_id}
            checkboxProps={{
              isChecked: isSelected(run.run_id),
              onToggle: () => toggleSelection(run.run_id),
              isStickyColumn: true,
              stickyMinWidth: '45px',
            }}
            onDelete={() => {
              setSelectedIds([run.run_id]);
              setIsDeleteModalOpen(true);
            }}
            run={run}
            mlflow={{
              isAvailable: isMlflowAvailable,
              experiments: mlflowExperiments,
              loaded: mlflowExperimentsLoaded,
              error: mlflowExperimentsError,
            }}
            nestedMlflowRuns={nestedRunsByRunId[run.run_id]}
            customCells={visibleMetricsColumnNames.map((metricName: string) => (
              <Td key={metricName} dataLabel={metricName}>
                {!runArtifactsLoaded && !runArtifactsError && !contextsError ? (
                  <Skeleton />
                ) : (
                  run.metrics.find((metric) => metric.name === metricName)?.value ?? (
                    <UnavailableMetricValue />
                  )
                )}
              </Td>
            ))}
            runType={runType}
          />
        )}
        variant={TableVariant.compact}
        getColumnSort={getTableColumnSort({
          columns,
          ...tableProps,
        })}
        data-testid={`${runType}-runs-table`}
        id={`${runType}-runs-table`}
      />
      {isArchiveModalOpen && (
        <ArchiveRunModal
          runs={selectedRuns}
          onCancel={() => {
            setIsArchiveModalOpen(false);
            setSelectedIds([]);
          }}
        />
      )}
      {isRestoreModalOpen &&
        (!archivedExperiments.length ? (
          <RestoreRunModal
            runs={selectedRuns}
            onCancel={() => {
              setIsRestoreModalOpen(false);
              setSelectedIds([]);
            }}
          />
        ) : (
          <RestoreRunWithArchivedExperimentModal
            selectedRuns={selectedRuns}
            archivedExperiments={archivedExperiments}
            onClose={(restored: boolean) => {
              if (restored) {
                refreshAllAPI();
              }
              setIsRestoreModalOpen(false);
              setSelectedIds([]);
            }}
          />
        ))}
      {isDeleteModalOpen && (
        <DeletePipelineRunsModal
          toDeleteResources={selectedRuns}
          type={PipelineRunType.ARCHIVED}
          onClose={(deleted) => {
            fireFormTrackingEvent('Archived Pipeline Run Deleted', {
              outcome: TrackingOutcome.submit,
              success: true,
            });

            if (deleted) {
              refreshAllAPI();
            }
            setSelectedIds([]);
            setIsDeleteModalOpen(false);
          }}
        />
      )}
      {isCustomColModalOpen && (
        <CustomMetricsColumnsModal
          key={visibleMetricsNames.size}
          experimentId={experiment?.experiment_id}
          columns={[...new Set([...visibleMetricsColumnNames, ...visibleMetricsNames])].map(
            (metricName) => ({
              id: metricName,
              content: metricName,
              props: { checked: visibleMetricsColumnNames.includes(metricName) },
            }),
          )}
          onClose={() => setIsCustomColModalOpen(false)}
        />
      )}
    </>
  );
};

export default PipelineRunTable;
