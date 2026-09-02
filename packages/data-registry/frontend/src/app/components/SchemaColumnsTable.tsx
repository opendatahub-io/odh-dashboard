import React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateVariant, Label } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { SchemaField } from '~/app/types';

type SchemaColumnsTableProps = {
  columns: SchemaField[];
};

const SchemaColumnsTable: React.FC<SchemaColumnsTableProps> = ({ columns }) => {
  if (columns.length === 0) {
    return (
      <EmptyState headingLevel="h3" titleText="No schema columns" variant={EmptyStateVariant.xs}>
        <EmptyStateBody>This table has no schema columns defined.</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <Table aria-label="Schema columns" variant="compact" data-testid="schema-columns-table">
      <Thead>
        <Tr>
          <Th>Name</Th>
          <Th>Type</Th>
          <Th>Description</Th>
          <Th>Nullable</Th>
        </Tr>
      </Thead>
      <Tbody>
        {columns.map((col) => (
          <Tr key={col.name}>
            <Td dataLabel="Name" data-testid={`schema-column-name-${col.name}`}>
              {col.name}
            </Td>
            <Td dataLabel="Type">
              <Label isCompact data-testid={`schema-column-type-${col.name}`}>
                {col.type}
              </Label>
            </Td>
            <Td dataLabel="Description">{col.description || '-'}</Td>
            <Td dataLabel="Nullable">{col.nullable ? 'Yes' : 'No'}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export default SchemaColumnsTable;
