import * as React from 'react';
import { TableVariant } from '@patternfly/react-table';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import { Table } from '~/components/table';
import PipelinesTableRow from '~/concepts/pipelines/content/tables/pipeline/PipelinesTableRow';
import { pipelineColumns } from '~/concepts/pipelines/content/tables/columns';
import DeletePipelineCoreResourceModal from '~/concepts/pipelines/content/DeletePipelineCoreResourceModal';
import TableBase from '~/components/table/TableBase';

type PipelinesTableProps = {
  pipelines: PipelineKF[];
  pipelineDetailsPath: (namespace: string, id: string) => string;
  refreshPipelines: () => Promise<unknown>;
  loading?: boolean;
  totalSize?: number;
  page?: number;
  pageSize?: number;
  setPage?: (page: number) => void;
  setPageSize?: (pageSize: number) => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  setSortField?: (field: string) => void;
  setSortDirection?: (dir: 'asc' | 'desc') => void;
} & Pick<
  React.ComponentProps<typeof Table>,
  'toolbarContent' | 'emptyTableView' | 'enablePagination'
>;

const PipelinesTable: React.FC<PipelinesTableProps> = ({
  pipelines,
  pipelineDetailsPath,
  refreshPipelines,
  loading,
  totalSize,
  page,
  pageSize,
  setPage,
  setPageSize,
  sortField,
  sortDirection,
  setSortField,
  setSortDirection,
  ...tableProps
}) => {
  const [deleteTarget, setDeleteTarget] = React.useState<PipelineKF | null>(null);

  return (
    <>
      <TableBase
        {...tableProps}
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
        variant={TableVariant.compact}
        rowRenderer={(pipeline, rowIndex) => (
          <PipelinesTableRow
            key={pipeline.id}
            pipeline={pipeline}
            rowIndex={rowIndex}
            pipelineDetailsPath={pipelineDetailsPath}
            onDeletePipeline={() => setDeleteTarget(pipeline)}
          />
        )}
        disableRowRenderSupport
        getColumnSort={(columnIndex) =>
          setSortField && setSortDirection && pipelineColumns[columnIndex].sortable
            ? {
                sortBy: {
                  index: pipelineColumns.findIndex((c) => c.field === sortField),
                  direction: sortDirection,
                  defaultDirection: 'asc',
                },
                onSort: (_event, index, direction) => {
                  setSortField(String(pipelineColumns[index].field));
                  setSortDirection(direction);
                },
                columnIndex,
              }
            : undefined
        }
      />
      <DeletePipelineCoreResourceModal
        type="pipeline"
        toDeleteResources={deleteTarget ? [deleteTarget] : []}
        onClose={(deleted) => {
          if (deleted) {
            refreshPipelines().then(() => setDeleteTarget(null));
          } else {
            setDeleteTarget(null);
          }
        }}
      />
    </>
  );
};

export default PipelinesTable;
