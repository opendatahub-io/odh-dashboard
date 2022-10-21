import * as React from 'react';
import { TableComposable, Tbody, Th, Thead, Tr } from '@patternfly/react-table';
import useTableColumnSort from '../../../../../utilities/useTableColumnSort';
import { DataConnection } from '../../../types';
import { columns } from './data';
import DataConnectionsTableRow from './DataConnectionsTableRow';
import { getDataConnectionId } from './utils';
import DeleteDataConnectionModal from './DeleteDataConnectionModal';

type DataConnectionsTableProps = {
  connections: DataConnection[];
  refreshDataConnections: () => void;
};

const DataConnectionsTable: React.FC<DataConnectionsTableProps> = ({
  connections: unsortedDataConnections,
  refreshDataConnections,
}) => {
  const [deleteDataConnection, setDeleteDataConnection] = React.useState<
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
              onDeleteDataConnection={setDeleteDataConnection}
            />
          ))}
        </Tbody>
      </TableComposable>
      <DeleteDataConnectionModal
        dataConnection={deleteDataConnection}
        onClose={(deleted) => {
          if (deleted) {
            refreshDataConnections();
          }
          setDeleteDataConnection(undefined);
        }}
      />
    </>
  );
};

export default DataConnectionsTable;
