import * as React from 'react';
import { Connection, ConnectionTypeConfigMapObj } from '#~/concepts/connectionTypes/types';
import { Table } from '#~/components/table';
import ConnectionsTableRow from './ConnectionsTableRow';
import { getColumns } from './connectionsTableColumns';
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

  const columns = React.useMemo(() => getColumns(connectionTypes), [connectionTypes]);

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
              { isSeparator: true },
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
        />
      )}
    </>
  );
};
export default ConnectionsTable;
