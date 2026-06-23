import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AgentRuntimesTable from '~/app/pages/agentRuntimes/AgentRuntimesTable';
import {
  createFailedRuntime,
  createMockAgentRuntime,
  createPendingRuntime,
  createReadyRuntime,
} from './agentRuntimeTestUtils';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

const defaultPaginationProps = {
  loaded: true,
  page: 1,
  pageSize: 10,
  onPageChange: jest.fn(),
  onPageSizeChange: jest.fn(),
};

describe('AgentRuntimesTable', () => {
  const onClearFilters = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all runtime rows', () => {
    render(
      <AgentRuntimesTable
        runtimes={[createReadyRuntime(), createPendingRuntime(), createFailedRuntime()]}
        onClearFilters={onClearFilters}
        {...defaultPaginationProps}
      />,
      { wrapper },
    );

    expect(
      screen.getByTestId('agent-runtime-row-agent-ops-demo-sample-support-agent'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('agent-runtime-row-agent-ops-demo-pending-agent'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('agent-runtime-row-agent-ops-demo-failed-agent')).toBeInTheDocument();
  });

  it('should render column headers', () => {
    render(
      <AgentRuntimesTable
        runtimes={[createMockAgentRuntime()]}
        onClearFilters={onClearFilters}
        {...defaultPaginationProps}
      />,
      { wrapper },
    );

    expect(screen.getByRole('columnheader', { name: /^Name$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^Project$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^Endpoints$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^Status$/i })).toBeInTheDocument();
  });

  it('should show empty table view when runtimes list is empty', () => {
    render(
      <AgentRuntimesTable
        runtimes={[]}
        onClearFilters={onClearFilters}
        {...defaultPaginationProps}
      />,
      { wrapper },
    );

    expect(
      screen.queryByTestId('agent-runtime-row-agent-ops-demo-sample-support-agent'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboard-empty-table-state')).toBeInTheDocument();
    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByText('Adjust your filters and try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument();
  });
});
