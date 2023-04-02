import * as React from 'react';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import Table from '~/components/Table';
import PipelinesTableRow from '~/concepts/pipelines/content/pipelinesTable/PipelinesTableRow';
import { columns } from './columns';

type PipelinesTableProps = {
  pipelines: PipelineKF[];
  contentLimit?: number;
};

const PipelinesTable: React.FC<PipelinesTableProps> = ({ pipelines, contentLimit }) => (
  <Table
    data={pipelines}
    columns={columns}
    truncateRenderingAt={contentLimit}
    rowRenderer={(pipeline, rowIndex) => (
      <PipelinesTableRow key={pipeline.id} pipeline={pipeline} rowIndex={rowIndex} />
    )}
    disableRowRenderSupport
  />
);

export default PipelinesTable;
