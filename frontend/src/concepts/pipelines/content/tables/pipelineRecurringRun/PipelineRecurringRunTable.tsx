import * as React from 'react';
import { TableVariant } from '@patternfly/react-table';
import { useParams } from 'react-router-dom';
import { PipelineRecurringRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { getTableColumnSort, useCheckboxTable, TableBase } from '~/components/table';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import DeletePipelineRunsModal from '~/concepts/pipelines/content/DeletePipelineRunsModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunType } from '~/pages/pipelines/global/runs/types';
import { PipelinesFilter } from '~/concepts/pipelines/types';
import usePipelineFilter from '~/concepts/pipelines/content/tables/usePipelineFilter';
import SimpleMenuActions from '~/components/SimpleMenuActions';
import { useSetVersionFilter } from '~/concepts/pipelines/content/tables/useSetVersionFilter';
import { pipelineRecurringRunColumns } from '~/concepts/pipelines/content/tables/columns';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import PipelineRecurringRunTableRow from './PipelineRecurringRunTableRow';
import PipelineRecurringRunTableToolbar from './PipelineRecurringRunTableToolbar';

type PipelineRecurringRunTableProps = {
  recurringRuns: PipelineRecurringRunKFv2[];
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
  loading,
  totalSize,
  page,
  pageSize,
  setPage,
  setPageSize,
  setFilter,
  ...tableProps
}) => {
  const { refreshAllAPI } = usePipelinesAPI();
  const { experimentId, pipelineVersionId } = useParams();
  const filterToolbarProps = usePipelineFilter(setFilter);
  const isExperimentsAvailable = useIsAreaAvailable(SupportedArea.PIPELINE_EXPERIMENTS).status;
  const {
    selections,
    tableProps: checkboxTableProps,
    toggleSelection,
    isSelected,
    // eslint-disable-next-line camelcase
  } = useCheckboxTable(recurringRuns.map(({ recurring_run_id }) => recurring_run_id));
  const [deleteResources, setDeleteResources] = React.useState<PipelineRecurringRunKFv2[]>([]);

  useSetVersionFilter(filterToolbarProps.onFilterUpdate);

  const getColumns = () => {
    let columns = pipelineRecurringRunColumns;

    if (isExperimentsAvailable && experimentId) {
      columns = columns.filter((column) => column.field !== 'experiment');
    }

    if (pipelineVersionId) {
      columns = columns.filter((column) => column.field !== 'pipeline_version');
    }

    return columns;
  };

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
        itemCount={totalSize}
        data={recurringRuns}
        columns={getColumns()}
        enablePagination
        emptyTableView={
          <DashboardEmptyTableView onClearFilters={filterToolbarProps.onClearFilters} />
        }
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
                          .map<PipelineRecurringRunKFv2 | undefined>((selection) =>
                            recurringRuns.find(
                              // eslint-disable-next-line camelcase
                              ({ recurring_run_id }) => recurring_run_id === selection,
                            ),
                          )
                          .filter((v): v is PipelineRecurringRunKFv2 => !!v),
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
            isChecked={isSelected(recurringRun.recurring_run_id)}
            onToggleCheck={() => toggleSelection(recurringRun.recurring_run_id)}
            onDelete={() => setDeleteResources([recurringRun])}
            recurringRun={recurringRun}
          />
        )}
        variant={TableVariant.compact}
        getColumnSort={getTableColumnSort({ columns: pipelineRecurringRunColumns, ...tableProps })}
        data-testid="schedules-table"
      />

      <DeletePipelineRunsModal
        toDeleteResources={deleteResources}
        type={PipelineRunType.SCHEDULED}
        onClose={(deleted) => {
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
