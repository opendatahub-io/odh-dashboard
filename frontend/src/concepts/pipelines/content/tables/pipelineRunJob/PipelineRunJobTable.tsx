import * as React from 'react';
import { TableVariant } from '@patternfly/react-table';
import { PipelineRunJobKFv2 } from '~/concepts/pipelines/kfTypes';
import { pipelineRunJobColumns } from '~/concepts/pipelines/content/tables/columns';
import { getTableColumnSort, useCheckboxTable, TableBase } from '~/components/table';
import PipelineRunJobTableRow from '~/concepts/pipelines/content/tables/pipelineRunJob/PipelineRunJobTableRow';
import PipelineRunJobTableToolbar from '~/concepts/pipelines/content/tables/pipelineRunJob/PipelineRunJobTableToolbar';
import DashboardEmptyTableView from '~/concepts/dashboard/DashboardEmptyTableView';
import DeletePipelineRunsModal from '~/concepts/pipelines/content/DeletePipelineRunsModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunType } from '~/pages/pipelines/global/runs/types';
import { PipelinesFilter } from '~/concepts/pipelines/types';
import usePipelineFilter from '~/concepts/pipelines/content/tables/usePipelineFilter';
import SimpleMenuActions from '~/components/SimpleMenuActions';

type PipelineRunTableProps = {
  jobs: PipelineRunJobKFv2[];
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

const PipelineRunJobTable: React.FC<PipelineRunTableProps> = ({
  jobs,
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
  const filterToolbarProps = usePipelineFilter(setFilter);
  const {
    selections,
    tableProps: checkboxTableProps,
    toggleSelection,
    isSelected,
    // eslint-disable-next-line camelcase
  } = useCheckboxTable(jobs.map(({ recurring_run_id }) => recurring_run_id));
  const [deleteResources, setDeleteResources] = React.useState<PipelineRunJobKFv2[]>([]);

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
        data={jobs}
        columns={pipelineRunJobColumns}
        enablePagination
        emptyTableView={
          <DashboardEmptyTableView onClearFilters={filterToolbarProps.onClearFilters} />
        }
        toolbarContent={
          <PipelineRunJobTableToolbar
            {...filterToolbarProps}
            data-testid="schedules-table-toolbar"
            dropdownActions={
              <SimpleMenuActions
                data-testid="run-table-toolbar-actions"
                dropdownItems={[
                  {
                    key: 'delete',
                    label: 'Delete',
                    onClick: () =>
                      setDeleteResources(
                        selections
                          .map<PipelineRunJobKFv2 | undefined>((selection) =>
                            // eslint-disable-next-line camelcase
                            jobs.find(({ recurring_run_id }) => recurring_run_id === selection),
                          )
                          .filter((v): v is PipelineRunJobKFv2 => !!v),
                      ),
                    isDisabled: !selections.length,
                  },
                ]}
              />
            }
          />
        }
        rowRenderer={(job) => (
          <PipelineRunJobTableRow
            key={job.recurring_run_id}
            isChecked={isSelected(job.recurring_run_id)}
            onToggleCheck={() => toggleSelection(job.recurring_run_id)}
            onDelete={() => setDeleteResources([job])}
            job={job}
          />
        )}
        variant={TableVariant.compact}
        getColumnSort={getTableColumnSort({ columns: pipelineRunJobColumns, ...tableProps })}
        data-testid="schedules-table"
      />

      <DeletePipelineRunsModal
        toDeleteResources={deleteResources}
        type={PipelineRunType.Scheduled}
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

export default PipelineRunJobTable;
