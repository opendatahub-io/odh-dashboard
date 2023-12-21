import * as React from 'react';
import { TableVariant } from '@patternfly/react-table';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import { Table, getTableColumnSort, useCheckboxTable } from '~/components/table';
import PipelinesTableRow from '~/concepts/pipelines/content/tables/pipeline/PipelinesTableRow';
import { pipelineColumns } from '~/concepts/pipelines/content/tables/columns';
import DeletePipelineCoreResourceModal from '~/concepts/pipelines/content/DeletePipelineCoreResourceModal';
import { TableBase } from '~/components/table';

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
  setSortField: (field: string) => void;
  setSortDirection: (dir: 'asc' | 'desc') => void;
} & Pick<
  React.ComponentProps<typeof Table>,
  'toolbarContent' | 'emptyTableView' | 'enablePagination'
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
  pipelineDetailsPath,
  ...tableProps
}) => {
  const {
    tableProps: checkboxTableProps,
    toggleSelection,
    isSelected,
  } = useCheckboxTable(pipelines.map(({ id }) => id));
  const [deleteTarget, setDeleteTarget] = React.useState<PipelineKF | null>(null);

  return (
    <>
      <TableBase
        {...tableProps}
        {...checkboxTableProps}
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
            isChecked={isSelected(pipeline.id)}
            onToggleCheck={() => toggleSelection(pipeline.id)}
            onDeletePipeline={() => setDeleteTarget(pipeline)}
            refreshPipelines={refreshPipelines}
            pipelineDetailsPath={pipelineDetailsPath}
          />
        )}
        disableRowRenderSupport
        getColumnSort={getTableColumnSort({
          columns: pipelineColumns,
          ...tableProps,
        })}
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
