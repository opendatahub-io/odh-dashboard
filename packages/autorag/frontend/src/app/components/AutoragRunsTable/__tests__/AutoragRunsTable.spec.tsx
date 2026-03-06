/* eslint-disable camelcase -- PipelineRun type uses snake_case */
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { PipelineRun } from '~/app/types';
import { AutoragRunsTable } from '~/app/components/AutoragRunsTable/index';

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

describe('AutoragRunsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render table with runs', () => {
    render(
      <AutoragRunsTable
        runs={mockRuns}
        totalSize={defaultPaginationProps.totalSize}
        page={defaultPaginationProps.page}
        pageSize={defaultPaginationProps.pageSize}
        onPageChange={defaultPaginationProps.onPageChange}
        onPerPageChange={defaultPaginationProps.onPerPageChange}
      />,
    );

    expect(screen.getByTestId('autorag-runs-table')).toBeInTheDocument();
  });

  it('should render run names', () => {
    render(
      <AutoragRunsTable
        runs={mockRuns}
        totalSize={defaultPaginationProps.totalSize}
        page={defaultPaginationProps.page}
        pageSize={defaultPaginationProps.pageSize}
        onPageChange={defaultPaginationProps.onPageChange}
        onPerPageChange={defaultPaginationProps.onPerPageChange}
      />,
    );

    expect(screen.getByTestId('run-name-r1')).toHaveTextContent('Run One');
    expect(screen.getByTestId('run-name-r2')).toHaveTextContent('Run Two');
  });

  it('should render empty view when there are no runs', () => {
    render(
      <AutoragRunsTable
        runs={[]}
        totalSize={0}
        page={1}
        pageSize={20}
        onPageChange={() => undefined}
        onPerPageChange={() => undefined}
      />,
    );

    expect(screen.getByTestId('autorag-runs-table')).toBeInTheDocument();
    expect(screen.getByTestId('empty-view')).toBeInTheDocument();
    expect(screen.getByTestId('empty-view')).toHaveTextContent('Empty');
  });

  it('should render Started column with relative time', () => {
    render(
      <AutoragRunsTable
        runs={mockRuns}
        totalSize={defaultPaginationProps.totalSize}
        page={defaultPaginationProps.page}
        pageSize={defaultPaginationProps.pageSize}
        onPageChange={defaultPaginationProps.onPageChange}
        onPerPageChange={defaultPaginationProps.onPerPageChange}
      />,
    );

    // The mock relativeTime function returns '1 day ago'
    const relativeTimeElements = screen.getAllByText('1 day ago');
    expect(relativeTimeElements.length).toBeGreaterThan(0);
  });
});
