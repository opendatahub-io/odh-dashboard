import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClusterQueueWorkloadStatusLabel from '../ClusterQueueWorkloadStatusLabel';
import { QuotaUsageWorkloadStatuses } from '../../../types';

describe('ClusterQueueWorkloadStatusLabel', () => {
  it('renders Pending with the status label test id', () => {
    render(<ClusterQueueWorkloadStatusLabel status={QuotaUsageWorkloadStatuses.Pending} />);

    expect(screen.getByTestId('cluster-queue-workload-status-label')).toHaveTextContent('Pending');
  });

  it('renders Running from the Kueue status mapping', () => {
    render(<ClusterQueueWorkloadStatusLabel status={QuotaUsageWorkloadStatuses.Running} />);

    expect(screen.getByTestId('cluster-queue-workload-status-label')).toHaveTextContent('Running');
  });
});
