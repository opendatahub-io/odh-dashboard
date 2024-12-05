import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Skeleton, Tooltip } from '@patternfly/react-core';
import { TableVariant, Td } from '@patternfly/react-table';
import { ColumnsIcon } from '@patternfly/react-icons';

import { TableBase, getTableColumnSort, useCheckboxTable } from '~/components/table';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import { getPipelineRunColumns } from '~/concepts/pipelines/content/tables/columns';
import PipelineRunTableRow from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableRow';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import PipelineRunTableToolbar from '~/concepts/pipelines/content/tables/pipelineRun/PipelineRunTableToolbar';
import DeletePipelineRunsModal from '~/concepts/pipelines/content/DeletePipelineRunsModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunType } from '~/pages/pipelines/global/runs/types';
import { PipelinesFilter } from '~/concepts/pipelines/types';
import { usePipelineFilterSearchParams } from '~/concepts/pipelines/content/tables/usePipelineFilter';
import SimpleMenuActions from '~/components/SimpleMenuActions';
import { ArchiveRunModal } from '~/pages/pipelines/global/runs/ArchiveRunModal';
import { RestoreRunModal } from '~/pages/pipelines/global/runs/RestoreRunModal';
import { compareRunsRoute, createRunRoute } from '~/routes';
import {
  ExperimentContext,
  useContextExperimentArchivedOrDeleted,
} from '~/pages/pipelines/global/experiments/ExperimentContext';
import { CustomMetricsColumnsModal } from './CustomMetricsColumnsModal';
import { UnavailableMetricValue } from './UnavailableMetricValue';
import { useMetricColumns } from './useMetricColumns';

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
  const navigate = useNavigate();
  const { experiment } = React.useContext(ExperimentContext);
  const { namespace, refreshAllAPI } = usePipelinesAPI();
  const { onClearFilters, ...filterToolbarProps } = usePipelineFilterSearchParams(setFilter);
  const { metricsColumnNames, runs, runArtifactsError, runArtifactsLoaded, metricsNames } =
    useMetricColumns(runWithoutMetrics, experiment?.experiment_id);
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
  const selectedRuns = selectedIds.reduce((acc: PipelineRunKF[], selectedId) => {
    const selectedRun = runs.find((run) => run.run_id === selectedId);

    if (selectedRun) {
      acc.push(selectedRun);
    }

    return acc;
  }, []);
  const restoreButtonTooltipRef = React.useRef(null);
  const { isExperimentArchived } = useContextExperimentArchivedOrDeleted();

  const primaryToolbarAction = React.useMemo(() => {
    if (runType === PipelineRunType.ARCHIVED) {
      return (
        <>
          {isExperimentArchived && (
            <Tooltip
              content="Archived runs cannot be restored until its associated experiment is restored."
              triggerRef={restoreButtonTooltipRef}
            />
          )}
          <Button
            data-testid="restore-button"
            variant="primary"
            isDisabled={!selectedIds.length}
            isAriaDisabled={isExperimentArchived}
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
        onClick={() => navigate(createRunRoute(namespace, experiment?.experiment_id))}
      >
        Create run
      </Button>
    );
  }, [
    runType,
    isExperimentArchived,
    selectedIds.length,
    navigate,
    namespace,
    experiment?.experiment_id,
  ]);

  const compareRunsAction =
    !isExperimentArchived && runType === PipelineRunType.ACTIVE ? (
      <Tooltip content="Select up to 10 runs to compare.">
        <Button
          key="compare-runs"
          data-testid="compare-runs-button"
          variant="secondary"
          isAriaDisabled={selectedIds.length === 0 || selectedIds.length > 10}
          onClick={() =>
            navigate(compareRunsRoute(namespace, selectedIds, experiment?.experiment_id))
          }
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
    ? getPipelineRunColumns(metricsColumnNames).filter((column) => column.field !== 'experiment')
    : getPipelineRunColumns(metricsColumnNames);

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
        itemCount={totalSize}
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
                      : !(metricsColumnNames.length || metricsNames.size)
                      ? 'Customize metrics columns: No metrics available'
                      : 'Customize metrics columns'
                  }
                >
                  <Button
                    variant="plain"
                    aria-label="Customize metrics column button"
                    isAriaDisabled={
                      !runArtifactsLoaded || !(metricsColumnNames.length || metricsNames.size)
                    }
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
            customCells={metricsColumnNames.map((metricName: string) => (
              <Td key={metricName} dataLabel={metricName}>
                {!runArtifactsLoaded && !runArtifactsError ? (
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
      {isRestoreModalOpen && (
        <RestoreRunModal
          runs={selectedRuns}
          onCancel={() => {
            setIsRestoreModalOpen(false);
            setSelectedIds([]);
          }}
        />
      )}
      {isDeleteModalOpen && (
        <DeletePipelineRunsModal
          toDeleteResources={selectedRuns}
          type={PipelineRunType.ARCHIVED}
          onClose={(deleted) => {
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
          key={metricsNames.size}
          experimentId={experiment?.experiment_id}
          columns={[...new Set([...metricsColumnNames, ...metricsNames])].map((metricName) => ({
            id: metricName,
            content: metricName,
            props: { checked: metricsColumnNames.includes(metricName) },
          }))}
          onClose={() => setIsCustomColModalOpen(false)}
        />
      )}
    </>
  );
};

export default PipelineRunTable;
