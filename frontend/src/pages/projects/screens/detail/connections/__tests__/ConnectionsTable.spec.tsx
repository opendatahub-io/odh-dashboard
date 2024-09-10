import React from 'react';
import { render, screen } from '@testing-library/react';
import ConnectionsTable from '~/pages/projects/screens/detail/connections/ConnectionsTable';
import { Connection } from '~/pages/projects/screens/detail/connections/types';

const connections: Connection[] = [
  {
    kind: 'Secret',
    apiVersion: 'v1',
    metadata: {
      name: 'connection1',
      namespace: 'ds-project',
      labels: { 'opendatahub.io/dashboard': 'true', 'opendatahub.io/managed': 'true' },
      annotations: {
        'opendatahub.io/connection-type': 's3',
        'openshift.io/display-name': 'connection1',
        'openshift.io/description': 'desc1',
      },
    },
    data: {},
  },
];

describe('ConnectionsTable', () => {
  it('should render table', () => {
    render(<ConnectionsTable connections={connections} />);

    expect(screen.getByTestId('connection-table')).toBeTruthy();
    expect(screen.getByText('connection1')).toBeTruthy();
    expect(screen.getByText('desc1')).toBeTruthy();
  });
});
