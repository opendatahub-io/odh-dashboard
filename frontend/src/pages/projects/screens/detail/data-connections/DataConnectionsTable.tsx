import * as React from 'react';
import { Table } from '~/components/table';
import { DataConnection } from '~/pages/projects/types';
import { columns } from './data';
import DataConnectionsTableRow from './DataConnectionsTableRow';
import { getDataConnectionId } from './utils';
import DeleteDataConnectionModal from './DeleteDataConnectionModal';
import ManageDataConnectionModal from './ManageDataConnectionModal';

type DataConnectionsTableProps = {
  connections: DataConnection[];
  refreshData: () => void;
};

const DataConnectionsTable: React.FC<DataConnectionsTableProps> = ({
  connections,
  refreshData,
}) => {
  const [editDataConnection, setEditDataConnection] = React.useState<DataConnection | undefined>();
  const [deleteDataConnection, setDeleteDataConnection] = React.useState<
    DataConnection | undefined
  >();

  return (
    <>
      <Table
        variant="compact"
        data={connections}
        data-testid="data-connection-table"
        columns={columns}
        rowRenderer={(dataConnection, index) => (
          <DataConnectionsTableRow
            rowIndex={index}
            key={getDataConnectionId(dataConnection)}
            obj={dataConnection}
            onEditDataConnection={setEditDataConnection}
            onDeleteDataConnection={setDeleteDataConnection}
          />
        )}
      />
      <ManageDataConnectionModal
        isOpen={!!editDataConnection}
        existingData={editDataConnection}
        onClose={(updated) => {
          if (updated) {
            refreshData();
          }
          setEditDataConnection(undefined);
        }}
      />
      {deleteDataConnection ? (
        <DeleteDataConnectionModal
          dataConnection={deleteDataConnection}
          onClose={(deleted) => {
            if (deleted) {
              refreshData();
            }
            setDeleteDataConnection(undefined);
          }}
        />
      ) : null}
    </>
  );
};

export default DataConnectionsTable;
