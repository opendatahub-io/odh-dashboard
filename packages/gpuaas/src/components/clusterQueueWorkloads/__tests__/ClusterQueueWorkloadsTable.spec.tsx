import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClusterQueueWorkloadsTable from '../ClusterQueueWorkloadsTable';
import {
  QuotaUsageWorkloadStatuses,
  QuotaUsageWorkloadTypes,
  type ClusterQueueWorkloadRow,
} from '../../../types';

jest.mock('@odh-dashboard/ui-core', () => {
  const actual = jest.requireActual('@odh-dashboard/ui-core');
  return {
    ...actual,
    Table: ({
      data,
      rowRenderer,
      toolbarContent,
      emptyTableView,
      'data-testid': testId,
    }: {
      data: ClusterQueueWorkloadRow[];
      rowRenderer: (row: ClusterQueueWorkloadRow) => React.ReactNode;
      toolbarContent: React.ReactNode;
      emptyTableView: React.ReactNode;
      'data-testid'?: string;
    }) => (
      <div data-testid={testId}>
        {toolbarContent}
        {data.length === 0 ? emptyTableView : data.map((row) => rowRenderer(row))}
      </div>
    ),
    DashboardEmptyTableView: ({ onClearFilters }: { onClearFilters: () => void }) => (
      <button
        type="button"
        data-testid="cluster-queue-workloads-clear-filters"
        onClick={onClearFilters}
      >
        Clear filters
      </button>
    ),
  };
});

const sampleWorkloads: ClusterQueueWorkloadRow[] = [
  {
    name: 'wl-alpha',
    namespace: 'dsp-1',
    project: 'Alpha team',
    clusterQueue: 'gpu-cq',
    type: QuotaUsageWorkloadTypes.Workbench,
    status: QuotaUsageWorkloadStatuses.Queued,
    localQueue: 'user-queue',
    accelerators: 1,
    queuePosition: 2,
  },
  {
    name: 'wl-beta',
    namespace: 'dsp-2',
    project: 'Beta team',
    clusterQueue: 'gpu-cq',
    type: QuotaUsageWorkloadTypes.Serve,
    status: QuotaUsageWorkloadStatuses.Running,
    localQueue: 'serve-queue',
    accelerators: 2,
    queuePosition: undefined,
  },
];

describe('ClusterQueueWorkloadsTable', () => {
  it('shows loading spinner while data is loading', () => {
    render(<ClusterQueueWorkloadsTable workloads={[]} loaded={false} tableId="gpu-cq" />);

    expect(screen.getByTestId('cluster-queue-workloads-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('cluster-queue-workloads-table')).not.toBeInTheDocument();
  });

  it('shows empty state when loaded with no workloads', () => {
    render(<ClusterQueueWorkloadsTable workloads={[]} loaded tableId="gpu-cq" />);

    expect(screen.getByTestId('cluster-queue-workloads-empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('cluster-queue-workloads-table')).not.toBeInTheDocument();
  });

  it('shows only the error state when loaded with no workloads after a load failure', () => {
    render(
      <ClusterQueueWorkloadsTable
        workloads={[]}
        loaded
        error={new Error('namespace fetch failed')}
        tableId="gpu-cq"
      />,
    );

    expect(screen.getByTestId('cluster-queue-workloads-error')).toHaveTextContent(
      'namespace fetch failed',
    );
    expect(screen.queryByTestId('cluster-queue-workloads-empty-state')).not.toBeInTheDocument();
  });

  it('renders workload rows and toolbar', () => {
    render(<ClusterQueueWorkloadsTable workloads={sampleWorkloads} loaded tableId="gpu-cq" />);

    expect(screen.getByTestId('cluster-queue-workloads-table')).toBeInTheDocument();
    expect(screen.getByTestId('cluster-queue-workloads-table-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('cluster-queue-workload-row-dsp-1-wl-alpha')).toBeInTheDocument();
    expect(screen.getByTestId('cluster-queue-workload-row-dsp-2-wl-beta')).toBeInTheDocument();
    expect(screen.getByText('wl-alpha')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('shows inline error above the table when workloads are present', () => {
    render(
      <ClusterQueueWorkloadsTable
        workloads={sampleWorkloads}
        loaded
        error={new Error('partial namespace failure')}
        tableId="gpu-cq"
      />,
    );

    expect(screen.getByTestId('cluster-queue-workloads-error')).toHaveTextContent(
      'partial namespace failure',
    );
    expect(screen.getByTestId('cluster-queue-workloads-table')).toBeInTheDocument();
  });
});
