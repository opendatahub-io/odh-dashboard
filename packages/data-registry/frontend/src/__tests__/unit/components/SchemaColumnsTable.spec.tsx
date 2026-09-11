import React from 'react';
import { render, screen } from '@testing-library/react';
import SchemaColumnsTable from '~/app/components/SchemaColumnsTable';
import { SchemaField } from '~/app/types';

const mockColumns: SchemaField[] = [
  { name: 'id', type: 'integer', nullable: false, description: 'Primary key' },
  { name: 'name', type: 'string', nullable: true, description: 'Display name' },
  { name: 'status', type: 'string', nullable: false },
];

describe('SchemaColumnsTable', () => {
  it('should render column names', () => {
    render(<SchemaColumnsTable columns={mockColumns} />);
    expect(screen.getByTestId('schema-column-name-id')).toHaveTextContent('id');
    expect(screen.getByTestId('schema-column-name-name')).toHaveTextContent('name');
    expect(screen.getByTestId('schema-column-name-status')).toHaveTextContent('status');
  });

  it('should render column types', () => {
    render(<SchemaColumnsTable columns={mockColumns} />);
    expect(screen.getByText('integer')).toBeTruthy();
    expect(screen.getAllByText('string')).toHaveLength(2);
  });

  it('should show all schema columns', () => {
    render(<SchemaColumnsTable columns={mockColumns} />);
    const headers = screen.getByTestId('schema-columns-table').querySelectorAll('thead th');
    expect(headers).toHaveLength(4);
    expect(headers[0]).toHaveTextContent('Name');
    expect(headers[1]).toHaveTextContent('Type');
    expect(headers[2]).toHaveTextContent('Description');
    expect(headers[3]).toHaveTextContent('Nullable');
  });

  it('should render empty state when no columns', () => {
    render(<SchemaColumnsTable columns={[]} />);
    expect(screen.getByText('No schema columns')).toBeTruthy();
    expect(screen.queryByTestId('schema-columns-table')).not.toBeInTheDocument();
  });
});
