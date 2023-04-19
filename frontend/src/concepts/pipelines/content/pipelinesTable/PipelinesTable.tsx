import * as React from 'react';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import Table from '~/components/Table';
import PipelinesTableRow from '~/concepts/pipelines/content/pipelinesTable/PipelinesTableRow';
import { columns } from './columns';

type PipelinesTableProps = {
  pipelines: PipelineKF[];
  pipelineDetailsPath: (namespace: string, id: string) => string;
  contentLimit?: number;
};

const PipelinesTable: React.FC<PipelinesTableProps> = ({
  pipelines,
  contentLimit,
  pipelineDetailsPath,
}) => (
  <Table
    data={pipelines}
    columns={columns}
    truncateRenderingAt={contentLimit}
    rowRenderer={(pipeline, rowIndex) => (
      <PipelinesTableRow
        key={pipeline.id}
        pipeline={pipeline}
        rowIndex={rowIndex}
        pipelineDetailsPath={pipelineDetailsPath}
      />
    )}
    disableRowRenderSupport
  />
);

export default PipelinesTable;
