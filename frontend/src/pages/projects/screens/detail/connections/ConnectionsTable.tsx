import * as React from 'react';
import { Connection, ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import { deleteSecret } from '~/api';
import { Table } from '~/components/table';
import ConnectionsTableRow from './ConnectionsTableRow';
import { columns } from './connectionsTableColumns';
import { ConnectionsDeleteModal } from './ConnectionsDeleteModal';

type ConnectionsTableProps = {
  namespace: string;
  connections: Connection[];
  connectionTypes?: ConnectionTypeConfigMapObj[];
  refreshConnections: () => void;
  setManageConnectionModal: (connection: Connection) => void;
};

const ConnectionsTable: React.FC<ConnectionsTableProps> = ({
  namespace,
  connections,
  connectionTypes,
  refreshConnections,
  setManageConnectionModal,
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
            kebabActions={[
              {
                title: 'Edit',
                onClick: () => {
                  setManageConnectionModal(connection);
                },
              },
              {
                title: 'Delete',
                onClick: () => {
                  setDeleteConnection(connection);
                },
              },
            ]}
          />
        )}
        isStriped
      />
      {deleteConnection && (
        <ConnectionsDeleteModal
          namespace={namespace}
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
