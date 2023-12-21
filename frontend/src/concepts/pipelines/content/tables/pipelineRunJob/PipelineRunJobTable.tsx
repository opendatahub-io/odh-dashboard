import * as React from 'react';
import { TableVariant } from '@patternfly/react-table';
import { PipelineCoreResourceKF, PipelineRunJobKF } from '~/concepts/pipelines/kfTypes';
import { pipelineRunJobColumns } from '~/concepts/pipelines/content/tables/columns';
import { getTableColumnSort, useCheckboxTable } from '~/components/table';
import PipelineRunJobTableRow from '~/concepts/pipelines/content/tables/pipelineRunJob/PipelineRunJobTableRow';
import PipelineRunJobTableToolbar from '~/concepts/pipelines/content/tables/pipelineRunJob/PipelineRunJobTableToolbar';
import EmptyTableView from '~/concepts/pipelines/content/tables/EmptyTableView';
import DeletePipelineCoreResourceModal from '~/concepts/pipelines/content/DeletePipelineCoreResourceModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineType } from '~/concepts/pipelines/content/tables/utils';
import { PipelinesFilter } from '~/concepts/pipelines/types';
import { TableBase } from '~/components/table';
import usePipelineFilter from '~/concepts/pipelines/content/tables/usePipelineFilter';

type PipelineRunTableProps = {
  jobs: PipelineRunJobKF[];

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
  } = useCheckboxTable(jobs.map(({ id }) => id));
  const [deleteResources, setDeleteResources] = React.useState<PipelineCoreResourceKF[]>([]);

  return (
    <>
      <TableBase
        {...tableProps}
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
        emptyTableView={<EmptyTableView onClearFilters={filterToolbarProps.onClearFilters} />}
        toolbarContent={
          <PipelineRunJobTableToolbar
            {...filterToolbarProps}
            deleteAllEnabled={selections.length > 0}
            onDeleteAll={() =>
              setDeleteResources(
                selections
                  .map<PipelineCoreResourceKF | undefined>((selection) =>
                    jobs.find(({ id }) => id === selection),
                  )
                  .filter((v): v is PipelineCoreResourceKF => !!v),
              )
            }
          />
        }
        rowRenderer={(job) => (
          <PipelineRunJobTableRow
            key={job.id}
            isChecked={isSelected(job.id)}
            onToggleCheck={() => toggleSelection(job.id)}
            onDelete={() => setDeleteResources([job])}
            job={job}
          />
        )}
        variant={TableVariant.compact}
        getColumnSort={getTableColumnSort({ columns: pipelineRunJobColumns, ...tableProps })}
      />
      <DeletePipelineCoreResourceModal
        toDeleteResources={deleteResources}
        type={PipelineType.SCHEDULED_RUN}
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
