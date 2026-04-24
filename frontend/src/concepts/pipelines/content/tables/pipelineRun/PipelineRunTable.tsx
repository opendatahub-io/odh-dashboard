import React from 'react';
import { Link } from 'react-router-dom';

import { Button, Skeleton, Tooltip } from '@patternfly/react-core';
import { TableVariant, Td } from '@patternfly/react-table';
import { ColumnsIcon } from '@patternfly/react-icons';

import { useManageColumns, ManageColumnsModal } from 'mod-arch-shared';
import { TableBase, getTableColumnSort, useCheckboxTable } from '#~/components/table';
import { ExperimentKF, PipelineRunKF, StorageStateKF } from '#~/concepts/pipelines/kfTypes';
import { getPipelineRunColumns } from '#~/concepts/pipelines/content/tables/columns';
import useIsMlflowPipelinesAvailable from '#~/concepts/mlflow/hooks/useIsMlflowPipelinesAvailable';
import PipelineRunTableRow from '#~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRow';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
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
import {
  ExperimentContext,
  useContextExperimentArchivedOrDeleted,
} from '#~/pages/pipelines/global/experiments/ExperimentContext';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '#~/concepts/analyticsTracking/trackingProperties';
import { PipelineRunExperimentsContext } from '#~/pages/pipelines/global/runs/PipelineRunExperimentsContext';
import RestoreRunWithArchivedExperimentModal from '#~/pages/pipelines/global/runs/RestoreRunWithArchivedExperimentModal';
import useMlflowExperiments from '#~/concepts/mlflow/hooks/useMlflowExperiments';
import { UnavailableMetricValue } from './UnavailableMetricValue';
import { useMetricColumns } from './useMetricColumns';
import { filterByMlflowExperiment, getMetricsColumnsLocalStorageKey } from './utils';

const getMetricColumnField = (metricName: string): string => `metric:${metricName}`;

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
  const { data: mlflowExperiments, loaded: mlflowExperimentsLoaded } = useMlflowExperiments({
    workspace: isMlflowAvailable ? namespace : '',
  });
  const { onClearFilters, ...filterToolbarProps } = usePipelineFilterSearchParams(setFilter);
  const {
    runs: runsWithMetrics,
    contextsError,
    runArtifactsError,
    runArtifactsLoaded,
    metricsNames,
  } = useMetricColumns(runWithoutMetrics);

  const metricColumns = React.useMemo(
    () =>
      [...metricsNames].map((metricName) => ({
        label: metricName,
        field: getMetricColumnField(metricName),
        sortable: false,
      })),
    [metricsNames],
  );

  const defaultVisibleMetricColumnIds = React.useMemo(() => {
    const [firstDefaultMetricColumn, secondDefaultMetricColumn] = [...metricsNames];
    return [
      ...(firstDefaultMetricColumn ? [getMetricColumnField(firstDefaultMetricColumn)] : []),
      ...(secondDefaultMetricColumn ? [getMetricColumnField(secondDefaultMetricColumn)] : []),
    ];
  }, [metricsNames]);

  // Only initialize useManageColumns when metrics are loaded to avoid persisting empty defaults
  const manageColumnsResult = useManageColumns({
    allColumns: metricColumns,
    defaultVisibleColumnIds: defaultVisibleMetricColumnIds,
    storageKey: getMetricsColumnsLocalStorageKey(experiment?.experiment_id),
  });

  const { visibleColumns: visibleMetricColumns } = manageColumnsResult;
  const visibleMetricColumnNames = React.useMemo(
    () => visibleMetricColumns.map((column) => column.field.replace(/^metric:/, '')),
    [visibleMetricColumns],
  );

  const mlflowFilter = getDataValue(filterToolbarProps.filterData[FilterOptions.MLFLOW_EXPERIMENT]);
  const runs = React.useMemo(
    () => filterByMlflowExperiment(runsWithMetrics, mlflowFilter),
    [runsWithMetrics, mlflowFilter],
  );
  const effectiveTotalSize = mlflowFilter ? runs.length : totalSize;
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
  const selectedRuns = selectedIds.reduce((acc: PipelineRunKF[], selectedId) => {
    const selectedRun = runs.find((run) => run.run_id === selectedId);

    if (selectedRun) {
      acc.push(selectedRun);
    }

    return acc;
  }, []);
  const restoreButtonTooltipRef = React.useRef(null);
  const archivedExperiments = selectedRuns.reduce<ExperimentKF[]>((acc, selectedRun) => {
    const currentExperiment = allExperiments.find(
      (e) => e.experiment_id === selectedRun.experiment_id,
    );

    if (currentExperiment && currentExperiment.storage_state === StorageStateKF.ARCHIVED) {
      // Create a Set to track unique experiment_id
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
  const compareRunsHref = compareRunsRoute(namespace, selectedIds, experiment?.experiment_id);
  const isCompareDisabled = selectedIds.length === 0 || selectedIds.length > 10;
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
      <Tooltip content="Select up to 10 runs to compare.">
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
    ? getPipelineRunColumns(visibleMetricColumns, isMlflowAvailable).filter(
        (column) => column.field !== 'run_group',
      )
    : getPipelineRunColumns(visibleMetricColumns, isMlflowAvailable);

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
                    runArtifactsError || contextsError
                      ? 'Customize metrics columns: Error loading metrics'
                      : !runArtifactsLoaded
                        ? 'Customize metrics columns: Loading metrics...'
                        : !metricsNames.size
                          ? 'Customize metrics columns: No metrics available'
                          : 'Customize metrics columns'
                  }
                >
                  <Button
                    variant="plain"
                    aria-label="Customize metrics column button"
                    data-testid="customize-metrics-columns-button"
                    isAriaDisabled={
                      !!runArtifactsError ||
                      !!contextsError ||
                      !runArtifactsLoaded ||
                      !metricsNames.size
                    }
                    onClick={manageColumnsResult.openModal}
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
            }}
            customCells={visibleMetricColumnNames.map((metricName: string) => (
              <Td key={metricName} dataLabel={metricName}>
                {!runArtifactsLoaded && !runArtifactsError && !contextsError ? (
                  <Skeleton />
                ) : (
                  (run.metrics.find((metric) => metric.name === metricName)?.value ?? (
                    <UnavailableMetricValue />
                  ))
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
      <ManageColumnsModal
        manageColumnsResult={manageColumnsResult}
        description="Select up to 10 metrics that will display as columns in the table. Drag and drop column names to reorder them."
        dataTestId="custom-metrics-columns-modal"
      />
    </>
  );
};

export default PipelineRunTable;
