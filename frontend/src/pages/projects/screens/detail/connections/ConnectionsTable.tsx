import * as React from 'react';
import { Connection, ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import { deleteSecret } from '~/api';
import { Table } from '~/components/table';
import ConnectionsTableRow from './ConnectionsTableRow';
import { columns } from './connectionsTableColumns';
import { ConnectionsDeleteModal } from './ConnectionsDeleteModal';

type ConnectionsTableProps = {
  connections: Connection[];
  connectionTypes?: ConnectionTypeConfigMapObj[];
  refreshConnections: () => void;
};

const ConnectionsTable: React.FC<ConnectionsTableProps> = ({
  connections,
  connectionTypes,
  refreshConnections,
}) => {
  const [deleteConnection, setDeleteConnection] = React.useState<Connection>();

  return (
    <>
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
            onDeleteConnection={() => setDeleteConnection(connection)}
          />
        )}
        isStriped
      />
      {deleteConnection && (
        <ConnectionsDeleteModal
          deleteConnection={deleteConnection}
          onClose={(deleted) => {
            setDeleteConnection(undefined);
            if (deleted) {
              refreshConnections();
            }
          }}
          onDelete={() =>
            deleteSecret(deleteConnection.metadata.namespace, deleteConnection.metadata.name)
          }
        />
      )}
    </>
  );
};
export default ConnectionsTable;
