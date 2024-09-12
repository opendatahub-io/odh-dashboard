import * as React from 'react';
import { Connection, ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import { Table } from '~/components/table';
import ConnectionsTableRow from './ConnectionsTableRow';
import { columns } from './connectionsTableColumns';

type ConnectionsTableProps = {
  connections: Connection[];
  connectionTypes?: ConnectionTypeConfigMapObj[];
};

const ConnectionsTable: React.FC<ConnectionsTableProps> = ({ connections, connectionTypes }) => (
  <Table
    data={connections}
    data-testid="connection-table"
    columns={columns}
    rowRenderer={(connection) => (
      <ConnectionsTableRow
        key={connection.metadata.name}
        obj={connection}
        connectionTypes={connectionTypes}
        onEditConnection={() => undefined}
        onDeleteConnection={() => undefined}
      />
    )}
    isStriped
  />
);
export default ConnectionsTable;
