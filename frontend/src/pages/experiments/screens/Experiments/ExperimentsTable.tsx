import * as React from 'react';
import { RegistryExperiment } from '#~/concepts/modelRegistry/types.ts';
import { Table } from '#~/components/table';
import { experimentsColumns } from './ExperimentsTableColumns';
import ExperimentsTableRow from './ExperimentsTableRow';

type ExperimentsTableProps = {
  experiments: RegistryExperiment[];
};

const ExperimentsTable: React.FC<ExperimentsTableProps> = ({ experiments }) => (
  <Table
    data-testid="experiments-table"
    data={experiments}
    columns={experimentsColumns}
    defaultSortColumn={0}
    enablePagination
    rowRenderer={(experiment: RegistryExperiment) => (
      <ExperimentsTableRow key={experiment.id} experiment={experiment} />
    )}
  />
);

export default ExperimentsTable;
