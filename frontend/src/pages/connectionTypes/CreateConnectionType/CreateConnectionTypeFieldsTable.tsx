import React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
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
        {fields.length > 0 ? (
          fields.map((row, index) => <CreateConnectionTypeFieldsTableRow key={index} row={row} />)
        ) : (
          <Tr>
            <Td colSpan={columns.length}>
              <Bullseye>
                <EmptyState variant={EmptyStateVariant.sm}>
                  <EmptyStateHeader
                    icon={<EmptyStateIcon icon={PlusCircleIcon} />}
                    titleText="No fields"
                  />
                  <EmptyStateBody>
                    Add fields to prompt users to input information, and optionally assign default
                    values to those fields. Connection name and description fields are included by
                    default.
                  </EmptyStateBody>
                </EmptyState>
              </Bullseye>
            </Td>
          </Tr>
        )}
      </Tbody>
    </Table>
  );
};
