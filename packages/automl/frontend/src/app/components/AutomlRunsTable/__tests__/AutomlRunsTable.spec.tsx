/* eslint-disable camelcase -- PipelineRun type uses snake_case */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { PipelineRun } from '~/app/types';
import { AutomlRunsTable } from '~/app/components/AutomlRunsTable/index';

jest.mock('@odh-dashboard/internal/components/table', () => {
  const MockTableBase = ({
    data,
    rowRenderer,
    emptyTableView,
    'data-testid': dataTestId,
  }: {
    data: PipelineRun[];
    rowRenderer: (run: PipelineRun) => React.ReactNode;
    emptyTableView?: React.ReactNode;
    'data-testid'?: string;
  }) => (
    <div data-testid={dataTestId ?? 'mock-table'}>
      {data.length === 0 && emptyTableView
        ? emptyTableView
        : data.map((run) => (
            <div key={run.run_id} data-testid={`table-row-${run.run_id}`}>
              {rowRenderer(run)}
            </div>
          ))}
    </div>
  );
  return { __esModule: true, TableBase: MockTableBase };
});

jest.mock('@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView', () => ({
  __esModule: true,
  default: () => <div data-testid="empty-view">Empty</div>,
}));

const mockRuns: PipelineRun[] = [
  {
    run_id: 'r1',
    display_name: 'Run One',
    description: 'First run',
    state: 'SUCCEEDED',
    created_at: '2025-01-17',
    pipeline_version_reference: { pipeline_id: 'p1', pipeline_version_id: 'v1' },
  },
  {
    run_id: 'r2',
    display_name: 'Run Two',
    description: 'Second run',
    state: 'RUNNING',
    created_at: '2025-01-16',
    pipeline_version_reference: { pipeline_id: 'p2', pipeline_version_id: 'v1' },
  },
];

const defaultPaginationProps = {
  totalSize: 2,
  page: 1,
  pageSize: 20,
  onPageChange: () => undefined,
  onPerPageChange: () => undefined,
};

describe('AutomlRunsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render table with runs', () => {
    render(
      <MemoryRouter>
        <AutomlRunsTable
          runs={mockRuns}
          namespace="test-ns"
          totalSize={defaultPaginationProps.totalSize}
          page={defaultPaginationProps.page}
          pageSize={defaultPaginationProps.pageSize}
          onPageChange={defaultPaginationProps.onPageChange}
          onPerPageChange={defaultPaginationProps.onPerPageChange}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('automl-runs-table')).toBeInTheDocument();
  });

  it('should render run names', () => {
    render(
      <MemoryRouter>
        <AutomlRunsTable
          runs={mockRuns}
          namespace="test-ns"
          totalSize={defaultPaginationProps.totalSize}
          page={defaultPaginationProps.page}
          pageSize={defaultPaginationProps.pageSize}
          onPageChange={defaultPaginationProps.onPageChange}
          onPerPageChange={defaultPaginationProps.onPerPageChange}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('run-name-r1')).toHaveTextContent('Run One');
    expect(screen.getByTestId('run-name-r2')).toHaveTextContent('Run Two');
  });

  it('should render empty view when there are no runs', () => {
    render(
      <AutomlRunsTable
        runs={[]}
        namespace="test-ns"
        totalSize={0}
        page={1}
        pageSize={20}
        onPageChange={() => undefined}
        onPerPageChange={() => undefined}
      />,
    );

    expect(screen.getByTestId('automl-runs-table')).toBeInTheDocument();
    expect(screen.getByTestId('empty-view')).toBeInTheDocument();
    expect(screen.getByTestId('empty-view')).toHaveTextContent('Empty');
  });

  it('should render Started column with timestamps', () => {
    render(
      <MemoryRouter>
        <AutomlRunsTable
          runs={mockRuns}
          namespace="test-ns"
          totalSize={defaultPaginationProps.totalSize}
          page={defaultPaginationProps.page}
          pageSize={defaultPaginationProps.pageSize}
          onPageChange={defaultPaginationProps.onPageChange}
          onPerPageChange={defaultPaginationProps.onPerPageChange}
        />
      </MemoryRouter>,
    );

    // Verify timestamps are rendered with correct datetime attributes
    const timestamps = screen.getAllByRole('time');
    expect(timestamps).toHaveLength(2);

    // Verify the datetime attributes match the mock data
    expect(timestamps[0]).toHaveAttribute('datetime', '2025-01-17T00:00:00.000Z');
    expect(timestamps[1]).toHaveAttribute('datetime', '2025-01-16T00:00:00.000Z');
  });
});
