import * as React from 'react';
import { PipelineKFv2 } from '~/concepts/pipelines/kfTypes';
import { Table, TableBase, getTableColumnSort } from '~/components/table';
import PipelinesTableRow from '~/concepts/pipelines/content/tables/pipeline/PipelinesTableRow';
import { pipelineColumns } from '~/concepts/pipelines/content/tables/columns';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import DeletePipelinesModal from '~/concepts/pipelines/content/DeletePipelinesModal';
import usePipelinesCheckboxTable from '~/concepts/pipelines/content/tables/pipeline/usePipelinesCheckboxTable';

type PipelinesTableProps = {
  pipelines: PipelineKFv2[];
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
  'toolbarContent' | 'emptyTableView' | 'enablePagination' | 'variant'
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
  ...sortProps
}) => {
  const { refreshAllAPI } = usePipelinesAPI();
  const {
    tableProps: checkboxTableProps,
    isSelected,
    toggleSelection,
    disableCheck,
  } = usePipelinesCheckboxTable(pipelines);

  const [deletePipelines, setDeletePipelines] = React.useState<PipelineKFv2[]>([]);

  return (
    <>
      <TableBase
        {...checkboxTableProps}
        enablePagination={enablePagination}
        emptyTableView={emptyTableView}
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
      <DeletePipelinesModal
        isOpen={deletePipelines.length !== 0}
        toDeletePipelines={deletePipelines}
        onClose={(deleted) => {
          if (deleted) {
            refreshAllAPI();
          }
          setDeletePipelines([]);
        }}
      />
    </>
  );
};

export default PipelinesTable;
