import * as React from 'react';
import { PipelineKF } from '#~/concepts/pipelines/kfTypes';
import { Table, TableBase, getTableColumnSort } from '#~/components/table';
import PipelinesTableRow from '#~/concepts/pipelines/content/tables/pipeline/PipelinesTableRow';
import { pipelineColumns } from '#~/concepts/pipelines/content/tables/columns';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import DeletePipelinesModal from '#~/concepts/pipelines/content/DeletePipelinesModal';
import usePipelinesCheckboxTable from '#~/concepts/pipelines/content/tables/pipeline/usePipelinesCheckboxTable';

type PipelinesTableProps = {
  pipelines: PipelineKF[];
  refreshPipelines: () => Promise<unknown>;
  loading?: boolean;
  totalSize?: number;
  page?: number;
  pageSize?: number;
  setPage?: (page: number) => void;
  setPageSize?: (pageSize: number) => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  setSortField: (field: string) => void;
  setSortDirection: (dir: 'asc' | 'desc') => void;
} & Pick<
  React.ComponentProps<typeof Table>,
  'toolbarContent' | 'emptyTableView' | 'enablePagination' | 'variant' | 'onClearFilters'
>;

const PipelinesTable: React.FC<PipelinesTableProps> = ({
  pipelines,
  refreshPipelines,
  loading,
  totalSize,
  page,
  pageSize,
  setPage,
  setPageSize,
  enablePagination,
  emptyTableView,
  toolbarContent,
  variant,
  onClearFilters,
  ...sortProps
}) => {
  const { refreshAllAPI } = usePipelinesAPI();
  const {
    tableProps: checkboxTableProps,
    isSelected,
    toggleSelection,
    disableCheck,
  } = usePipelinesCheckboxTable(pipelines);

  const [deletePipelines, setDeletePipelines] = React.useState<PipelineKF[]>([]);

  return (
    <>
      <TableBase
        {...checkboxTableProps}
        enablePagination={enablePagination}
        emptyTableView={emptyTableView}
        onClearFilters={onClearFilters}
        toolbarContent={toolbarContent}
        variant={variant}
        loading={loading}
        page={page}
        perPage={pageSize}
        onSetPage={
          setPage && typeof page !== 'undefined'
            ? (_, newPage) => {
                if (newPage < page || !loading) {
                  setPage(newPage);
                }
              }
            : undefined
        }
        onPerPageSelect={setPageSize ? (_, newSize) => setPageSize(newSize) : undefined}
        itemCount={totalSize}
        data={pipelines}
        columns={pipelineColumns}
        rowRenderer={(pipeline, rowIndex) => (
          <PipelinesTableRow
            key={pipeline.pipeline_id}
            pipeline={pipeline}
            rowIndex={rowIndex}
            isChecked={isSelected(pipeline)}
            onToggleCheck={() => toggleSelection(pipeline)}
            onDeletePipeline={() => setDeletePipelines([pipeline])}
            refreshPipelines={refreshPipelines}
            disableCheck={disableCheck}
          />
        )}
        disableRowRenderSupport
        getColumnSort={getTableColumnSort({
          columns: pipelineColumns,
          ...sortProps,
        })}
        data-testid="pipelines-table"
      />
      {deletePipelines.length ? (
        <DeletePipelinesModal
          toDeletePipelines={deletePipelines}
          onClose={(deleted) => {
            if (deleted) {
              refreshAllAPI();
            }
            setDeletePipelines([]);
          }}
        />
      ) : null}
    </>
  );
};

export default PipelinesTable;
