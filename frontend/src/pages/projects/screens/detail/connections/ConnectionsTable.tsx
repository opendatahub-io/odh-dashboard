import * as React from 'react';
import { Table } from '~/components/table';
import ConnectionsTableRow from './ConnectionsTableRow';
import { columns } from './connectionsTableColumns';
import { Connection } from './types';

type ConnectionsTableProps = {
  connections: Connection[];
};

const ConnectionsTable: React.FC<ConnectionsTableProps> = ({ connections }) => (
  <Table
    data={connections}
    data-testid="connection-table"
    columns={columns}
    rowRenderer={(connection) => (
      <ConnectionsTableRow
        key={connection.metadata.name}
        obj={connection}
        onEditConnection={() => undefined}
        onDeleteConnection={() => undefined}
      />
    )}
    isStriped
  />
);
export default ConnectionsTable;
