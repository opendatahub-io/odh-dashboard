import * as React from 'react';
import Table from '~/components/table/Table';

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
        columns={columns}
        rowRenderer={(dataConnection) => (
          <DataConnectionsTableRow
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
      <DeleteDataConnectionModal
        dataConnection={deleteDataConnection}
        onClose={(deleted) => {
          if (deleted) {
            refreshData();
          }
          setDeleteDataConnection(undefined);
        }}
      />
    </>
  );
};

export default DataConnectionsTable;
