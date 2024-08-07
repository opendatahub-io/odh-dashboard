import React from 'react';
import { Table, Thead, Tbody, Tr, Th } from '@patternfly/react-table';
import { ConnectionTypeField } from '~/concepts/connectionTypes/types';
import { CreateConnectionTypeFieldsTableRow } from './CreateConnectionTypeFieldsTableRow';

type CreateConnectionTypeFieldsTableProps = {
  fields: ConnectionTypeField[];
};

export const CreateConnectionTypeFieldsTable: React.FC<CreateConnectionTypeFieldsTableProps> = ({
  fields,
}) => {
  const columns = [
    'Section heading/field name',
    'Type',
    'Default value',
    'Environment variable',
    'Required',
  ];

  return (
    <Table data-testid="connection-type-fields-table">
      <Thead>
        <Tr>
          {columns.map((column, columnIndex) => (
            <Th key={columnIndex}>{column}</Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {fields.map((row, index) => (
          <CreateConnectionTypeFieldsTableRow key={index} row={row} />
        ))}
      </Tbody>
    </Table>
  );
};
