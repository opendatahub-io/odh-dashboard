import * as React from 'react';
import { TableComposable, Tbody, Th, Thead, Tr } from '@patternfly/react-table';
import useTableColumnSort from '../../../../../utilities/useTableColumnSort';
import { DataConnection } from '../../../types';
import { columns } from './data';
import DataConnectionsTableRow from './DataConnectionsTableRow';
import { getDataConnectionId } from './utils';

type DataConnectionsTableProps = {
  connections: DataConnection[];
};

const DataConnectionsTable: React.FC<DataConnectionsTableProps> = ({
  connections: unsortedDataConnections,
}) => {
  const sort = useTableColumnSort<DataConnection>(columns, 0);
  const sortedDataConnections = sort.transformData(unsortedDataConnections);

  return (
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
          <DataConnectionsTableRow key={getDataConnectionId(dataConnection)} obj={dataConnection} />
        ))}
      </Tbody>
    </TableComposable>
  );
};

export default DataConnectionsTable;
