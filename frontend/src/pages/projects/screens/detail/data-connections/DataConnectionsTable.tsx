import * as React from 'react';
import { TableComposable, Tbody, Th, Thead, Tr } from '@patternfly/react-table';
import useTableColumnSort from '../../../../../utilities/useTableColumnSort';
import { DataConnection } from '../../../types';
import { columns } from './data';
import DataConnectionsTableRow from './DataConnectionsTableRow';
import { getDataConnectionId } from './utils';
import DeleteDataConnectionModal from './DeleteDataConnectionModal';
import ChangeDataConnectionWorkbenchModal from './ChangeDataConnectionWorkbenchModal';
import ManageDataConnectionModal from './ManageDataConnectionModal';

type DataConnectionsTableProps = {
  connections: DataConnection[];
  refreshData: () => void;
};

const DataConnectionsTable: React.FC<DataConnectionsTableProps> = ({
  connections: unsortedDataConnections,
  refreshData,
}) => {
  const [editDataConnection, setEditDataConnection] = React.useState<DataConnection | undefined>();
  const [deleteDataConnection, setDeleteDataConnection] = React.useState<
    DataConnection | undefined
  >();
  const [connectExistingWorkbench, setConnectExistingWorkbench] = React.useState<
    DataConnection | undefined
  >();
  const sort = useTableColumnSort<DataConnection>(columns, 0);
  const sortedDataConnections = sort.transformData(unsortedDataConnections);

  return (
    <>
      <TableComposable variant="compact">
        <Thead>
          <Tr>
            {columns.map((col, i) => (
              <Th key={col.field} sort={sort.getColumnSort(i)} width={col.width}>
                {col.label}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {sortedDataConnections.map((dataConnection) => (
            <DataConnectionsTableRow
              key={getDataConnectionId(dataConnection)}
              obj={dataConnection}
              onEditDataConnection={setEditDataConnection}
              onDeleteDataConnection={setDeleteDataConnection}
              onConnectExistingWorkbench={setConnectExistingWorkbench}
            />
          ))}
        </Tbody>
      </TableComposable>
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
      <ChangeDataConnectionWorkbenchModal
        dataConnection={connectExistingWorkbench}
        onClose={(successfulConnect) => {
          if (successfulConnect) {
            refreshData();
          }
          setConnectExistingWorkbench(undefined);
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
