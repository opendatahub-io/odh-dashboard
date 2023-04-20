import * as React from 'react';
import { TableVariant } from '@patternfly/react-table';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import Table from '~/components/Table';
import PipelinesTableRow from '~/concepts/pipelines/content/pipelinesTable/PipelinesTableRow';
import DeletePipelineModal from '~/concepts/pipelines/content/DeletePipelineModal';
import { FetchStateRefreshPromise } from '~/utilities/useFetchState';
import { columns } from './columns';

type PipelinesTableProps = {
  pipelines: PipelineKF[];
  pipelineDetailsPath: (namespace: string, id: string) => string;
  refreshPipelines: FetchStateRefreshPromise;
  contentLimit?: number;
} & Pick<
  React.ComponentProps<typeof Table>,
  'toolbarContent' | 'emptyTableView' | 'enablePagination'
>;

const PipelinesTable: React.FC<PipelinesTableProps> = ({
  pipelines,
  contentLimit,
  pipelineDetailsPath,
  refreshPipelines,
  ...tableProps
}) => {
  const [deleteTarget, setDeleteTarget] = React.useState<PipelineKF | null>(null);

  return (
    <>
      <Table
        {...tableProps}
        data={pipelines}
        columns={columns}
        variant={TableVariant.compact}
        truncateRenderingAt={contentLimit}
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
      />
      <DeletePipelineModal
        pipeline={deleteTarget}
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
