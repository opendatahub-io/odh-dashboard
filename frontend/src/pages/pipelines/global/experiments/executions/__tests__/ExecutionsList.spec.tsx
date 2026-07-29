import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useGetExecutionsList } from '#~/concepts/pipelines/apiHooks/mlmd/useGetExecutionsList';
import { useMlmdListContext } from '#~/concepts/pipelines/context';
import { getGenericErrorCode } from '#~/api/errorUtils';
import ExecutionsList from '#~/pages/pipelines/global/experiments/executions/ExecutionsList';

jest.mock('#~/concepts/pipelines/apiHooks/mlmd/useGetExecutionsList');
jest.mock('#~/concepts/pipelines/context', () => ({
  useMlmdListContext: jest.fn(),
}));
jest.mock('#~/api/errorUtils');
jest.mock('#~/pages/pipelines/global/experiments/executions/ExecutionsTable', () => {
  const MockExecutionsTable = () => <div data-testid="executions-table">ExecutionsTable</div>;
  MockExecutionsTable.displayName = 'MockExecutionsTable';
  return { __esModule: true, default: MockExecutionsTable };
});
jest.mock('#~/pages/UnauthorizedError', () => {
  const MockUnauthorizedError = () => <div data-testid="unauthorized-error">UnauthorizedError</div>;
  MockUnauthorizedError.displayName = 'MockUnauthorizedError';
  return { __esModule: true, default: MockUnauthorizedError };
});

const mockUseGetExecutionsList = jest.mocked(useGetExecutionsList);
const mockUseMlmdListContext = jest.mocked(useMlmdListContext);
const mockGetGenericErrorCode = jest.mocked(getGenericErrorCode);

describe('ExecutionsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMlmdListContext.mockReturnValue({
      filterQuery: '',
      pageToken: undefined,
      maxResultSize: 10,
      orderBy: undefined,
      setFilterQuery: jest.fn(),
      setPageToken: jest.fn(),
      setMaxResultSize: jest.fn(),
      setOrderBy: jest.fn(),
    });
    mockGetGenericErrorCode.mockReturnValue(undefined);
  });

  it('should show error state when executions fail to load', () => {
    mockUseGetExecutionsList.mockReturnValue([
      undefined,
      false,
      new Error('Failed to fetch'),
      jest.fn(),
    ]);

    render(<ExecutionsList />);

    expect(screen.getByText('There was an issue loading executions')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
  });

  it('should show empty state when there are no executions', () => {
    mockUseGetExecutionsList.mockReturnValue([
      { executions: [], nextPageToken: '' },
      true,
      undefined,
      jest.fn(),
    ]);

    render(<ExecutionsList />);

    expect(screen.getByText('No executions')).toBeInTheDocument();
    expect(
      screen.getByText(/No experiments have been executed within this project/),
    ).toBeInTheDocument();
  });

  it('should show loading spinner when executions are not loaded', () => {
    mockUseGetExecutionsList.mockReturnValue([undefined, false, undefined, jest.fn()]);

    render(<ExecutionsList />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render ExecutionsTable when executions are available', () => {
    mockUseGetExecutionsList.mockReturnValue([
      {
        executions: [{ getId: () => 1 }] as never[],
        nextPageToken: '',
      },
      true,
      undefined,
      jest.fn(),
    ]);

    render(<ExecutionsList />);

    expect(screen.getByTestId('executions-table')).toBeInTheDocument();
  });

  it('should show unauthorized error when error code is 403', () => {
    mockGetGenericErrorCode.mockReturnValue(403);
    mockUseGetExecutionsList.mockReturnValue([undefined, false, new Error('Forbidden'), jest.fn()]);

    render(<ExecutionsList />);

    expect(screen.getByTestId('unauthorized-error')).toBeInTheDocument();
  });
});
