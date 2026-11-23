import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { createTrackingWrapper } from '../../../__tests__/unit/testUtils/TrackingProvider';
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

const mockTrackEvent = jest.fn();
const TrackingWrapper = createTrackingWrapper(mockTrackEvent);
const renderTracked = (element: React.ReactElement) =>
  render(element, { wrapper: TrackingWrapper });

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
  beforeEach(() => jest.clearAllMocks());
  it('shows loading spinner while data is loading', () => {
    renderTracked(<ClusterQueueWorkloadsTable workloads={[]} loaded={false} tableId="gpu-cq" />);

    expect(screen.getByTestId('cluster-queue-workloads-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('cluster-queue-workloads-table')).not.toBeInTheDocument();
  });

  it('shows empty state when loaded with no workloads', () => {
    renderTracked(<ClusterQueueWorkloadsTable workloads={[]} loaded tableId="gpu-cq" />);

    expect(screen.getByTestId('cluster-queue-workloads-empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('cluster-queue-workloads-table')).not.toBeInTheDocument();
  });

  it('shows only the error state when loaded with no workloads after a load failure', () => {
    renderTracked(
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
    renderTracked(
      <ClusterQueueWorkloadsTable workloads={sampleWorkloads} loaded tableId="gpu-cq" />,
    );

    expect(screen.getByTestId('cluster-queue-workloads-table')).toBeInTheDocument();
    expect(screen.getByTestId('cluster-queue-workloads-table-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('cluster-queue-workload-row-dsp-1-wl-alpha')).toBeInTheDocument();
    expect(screen.getByTestId('cluster-queue-workload-row-dsp-2-wl-beta')).toBeInTheDocument();
    expect(screen.getByText('wl-alpha')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('shows inline error above the table when workloads are present', () => {
    renderTracked(
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

describe('ClusterQueueWorkloadsTable tracking', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should emit nothing while loading, on load, or on rerender', () => {
    const { rerender } = renderTracked(
      <ClusterQueueWorkloadsTable workloads={[]} loaded={false} tableId="gpu-cq" />,
    );
    rerender(<ClusterQueueWorkloadsTable workloads={sampleWorkloads} loaded tableId="gpu-cq" />);
    rerender(<ClusterQueueWorkloadsTable workloads={sampleWorkloads} loaded tableId="gpu-cq" />);
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('should preserve silent name filtering, clearing, and reset-all', () => {
    renderTracked(
      <ClusterQueueWorkloadsTable workloads={sampleWorkloads} loaded tableId="gpu-cq" />,
    );
    const input = screen.getByRole('textbox', { name: 'Filter by name' });
    fireEvent.change(input, { target: { value: 'alpha' } });
    fireEvent.change(input, { target: { value: 'missing' } });
    fireEvent.click(screen.getByTestId('cluster-queue-workloads-clear-filters'));
    fireEvent.change(input, { target: { value: 'alpha' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('should preserve selected attribute values and match counts', async () => {
    const user = userEvent.setup();
    renderTracked(
      <ClusterQueueWorkloadsTable workloads={sampleWorkloads} loaded tableId="gpu-cq" />,
    );
    await user.click(screen.getByTestId('cluster-queue-workloads-status-filter'));
    await user.click(screen.getByRole('option', { name: 'Queued' }));
    expect(mockTrackEvent.mock.calls).toEqual([
      [
        'Infrastructure Drawer Workloads Filter Applied',
        { filterAttribute: 'status', filterValue: 'Queued', matchCount: 1 },
      ],
    ]);
  });
});
