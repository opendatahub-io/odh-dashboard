import React from 'react';
import { render, screen } from '@testing-library/react';
import ConnectionsTable from '~/pages/projects/screens/detail/connections/ConnectionsTable';
import { mockConnectionTypeConfigMapObj } from '~/__mocks__/mockConnectionType';
import { mockConnection } from '~/__mocks__/mockConnection';

describe('ConnectionsTable', () => {
  it('should render table', () => {
    render(
      <ConnectionsTable
        connections={[mockConnection({ displayName: 'connection1', description: 'desc1' })]}
        refreshConnections={() => undefined}
      />,
    );

    expect(screen.getByTestId('connection-table')).toBeTruthy();
    expect(screen.getByText('connection1')).toBeTruthy();
    expect(screen.getByText('desc1')).toBeTruthy();
    expect(screen.getByText('s3')).toBeTruthy();
  });

  it('should show display name of connection type if available', () => {
    render(
      <ConnectionsTable
        connections={[mockConnection({ displayName: 'connection1', description: 'desc1' })]}
        connectionTypes={[
          mockConnectionTypeConfigMapObj({ name: 's3', displayName: 'S3 Buckets' }),
        ]}
        refreshConnections={() => undefined}
      />,
    );

    expect(screen.getByTestId('connection-table')).toBeTruthy();
    expect(screen.getByText('connection1')).toBeTruthy();
    expect(screen.getByText('desc1')).toBeTruthy();
    expect(screen.queryByText('s3')).toBeFalsy();
    expect(screen.getByText('S3 Buckets')).toBeTruthy();
  });
});
