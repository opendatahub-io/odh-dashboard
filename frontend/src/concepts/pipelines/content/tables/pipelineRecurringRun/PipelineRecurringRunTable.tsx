import * as React from 'react';
import { TableVariant } from '@patternfly/react-table';
import { PipelineRecurringRunKF } from '#~/concepts/pipelines/kfTypes';
import { getTableColumnSort, useCheckboxTable, TableBase } from '#~/components/table';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
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
import { pipelineRecurringRunColumns } from '#~/concepts/pipelines/content/tables/columns';
import { ExperimentContext } from '#~/pages/pipelines/global/experiments/ExperimentContext';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '#~/concepts/analyticsTracking/trackingProperties';
import { filterByMlflowExperiment } from '#~/concepts/pipelines/content/tables/pipelineRun/utils';
import useIsMlflowPipelinesAvailable from '#~/concepts/mlflow/hooks/useIsMlflowPipelinesAvailable';
import useMlflowExperiments from '#~/concepts/mlflow/hooks/useMlflowExperiments';
import PipelineRecurringRunTableRow from './PipelineRecurringRunTableRow';
import PipelineRecurringRunTableToolbar from './PipelineRecurringRunTableToolbar';

type PipelineRecurringRunTableProps = {
  recurringRuns: PipelineRecurringRunKF[];
  refresh: () => void;
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
};

const PipelineRecurringRunTable: React.FC<PipelineRecurringRunTableProps> = ({
  recurringRuns,
  refresh,
  loading,
  totalSize,
  page,
  pageSize,
  setPage,
  setPageSize,
  setFilter,
  ...tableProps
}) => {
  const { namespace, refreshAllAPI } = usePipelinesAPI();
  const { experiment } = React.useContext(ExperimentContext);
  const { available: isMlflowAvailable } = useIsMlflowPipelinesAvailable();
  const { data: mlflowExperiments, loaded: mlflowExperimentsLoaded } = useMlflowExperiments({
    workspace: isMlflowAvailable ? namespace : '',
  });
  const { onClearFilters, ...filterToolbarProps } = usePipelineFilterSearchParams(setFilter);

  const mlflowFilter = getDataValue(filterToolbarProps.filterData[FilterOptions.MLFLOW_EXPERIMENT]);
  const filteredRecurringRuns = React.useMemo(
    () => filterByMlflowExperiment(recurringRuns, mlflowFilter),
    [recurringRuns, mlflowFilter],
  );
  const effectiveTotalSize = mlflowFilter ? filteredRecurringRuns.length : totalSize;

  const {
    selections,
    tableProps: checkboxTableProps,
    toggleSelection,
    isSelected,
    // eslint-disable-next-line camelcase
  } = useCheckboxTable(filteredRecurringRuns.map(({ recurring_run_id }) => recurring_run_id));
  const [deleteResources, setDeleteResources] = React.useState<PipelineRecurringRunKF[]>([]);

  const allColumns = pipelineRecurringRunColumns(isMlflowAvailable);
  const columns = experiment
    ? allColumns.filter((column) => column.field !== 'run_group')
    : allColumns;

  return (
    <>
      <TableBase
        {...checkboxTableProps}
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
        data={filteredRecurringRuns}
        columns={columns}
        enablePagination="compact"
        emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
        onClearFilters={onClearFilters}
        toolbarContent={
          <PipelineRecurringRunTableToolbar
            {...filterToolbarProps}
            data-testid="schedules-table-toolbar"
            dropdownActions={
              <SimpleMenuActions
                testId="run-table-toolbar-actions"
                dropdownItems={[
                  {
                    key: 'delete',
                    label: 'Delete',
                    onClick: () =>
                      setDeleteResources(
                        selections
                          .map<PipelineRecurringRunKF | undefined>((selection) =>
                            filteredRecurringRuns.find(
                              // eslint-disable-next-line camelcase
                              ({ recurring_run_id }) => recurring_run_id === selection,
                            ),
                          )
                          .filter((v): v is PipelineRecurringRunKF => !!v),
                      ),
                    isDisabled: !selections.length,
                  },
                ]}
              />
            }
          />
        }
        rowRenderer={(recurringRun) => (
          <PipelineRecurringRunTableRow
            key={recurringRun.recurring_run_id}
            refresh={refresh}
            isChecked={isSelected(recurringRun.recurring_run_id)}
            onToggleCheck={() => toggleSelection(recurringRun.recurring_run_id)}
            onDelete={() => setDeleteResources([recurringRun])}
            recurringRun={recurringRun}
            mlflow={{
              isAvailable: isMlflowAvailable,
              experiments: mlflowExperiments,
              loaded: mlflowExperimentsLoaded,
            }}
          />
        )}
        variant={TableVariant.compact}
        getColumnSort={getTableColumnSort({ columns, ...tableProps })}
        data-testid="schedules-table"
      />

      <DeletePipelineRunsModal
        toDeleteResources={deleteResources}
        type={PipelineRunType.SCHEDULED}
        onClose={(deleted) => {
          fireFormTrackingEvent('Pipeline Schedule Deleted', {
            outcome: TrackingOutcome.submit,
            success: true,
          });

          if (deleted) {
            refreshAllAPI();
          }
          setDeleteResources([]);
        }}
      />
    </>
  );
};

export default PipelineRecurringRunTable;
