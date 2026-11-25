/* eslint-disable camelcase */
import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useGetArtifactsList } from '#~/concepts/pipelines/apiHooks/useGetArtifactsList';
import { PipelineArtifactTypeKF } from '#~/concepts/pipelines/kfTypes';
import { ArtifactsList } from '#~/pages/pipelines/global/experiments/artifacts/ArtifactsList';

jest.mock('#~/concepts/pipelines/apiHooks/useGetArtifactsList', () => ({
  useGetArtifactsList: jest.fn(),
}));
jest.mock('@odh-dashboard/k8s-core/api/errorUtils', () => ({
  getGenericErrorCode: jest.fn(() => null),
}));
jest.mock('@odh-dashboard/ui-core/components/UnauthorizedError', () => ({
  __esModule: true,
  default: () => <div data-testid="unauthorized-error" />,
}));
jest.mock('../ArtifactsTable', () => ({
  ArtifactsTable: ({
    onNextPage,
    onFilterUpdate,
  }: {
    onNextPage: (page: number) => void;
    onFilterUpdate: (key: string, value: string) => void;
  }) => (
    <div data-testid="artifacts-table">
      <button type="button" onClick={() => onNextPage(2)}>
        Next
      </button>
      <button type="button" onClick={() => onFilterUpdate('name', 'filtered')}>
        Filter
      </button>
    </div>
  ),
}));

describe('ArtifactsList', () => {
  const useGetArtifactsListMock = jest.mocked(useGetArtifactsList);

  beforeEach(() => jest.clearAllMocks());

  it('should show empty state when the REST response has no artifacts', () => {
    useGetArtifactsListMock.mockReturnValue([{}, true, undefined, jest.fn()]);
    render(<ArtifactsList />);
    expect(screen.getByTestId('artifacts-list-empty-state')).toBeInTheDocument();
  });

  it('should show the table when artifacts exist', () => {
    useGetArtifactsListMock.mockReturnValue([
      { artifacts: [{ artifact_id: 'id', name: 'one', type: PipelineArtifactTypeKF.DATASET }] },
      true,
      undefined,
      jest.fn(),
    ]);
    render(<ArtifactsList />);
    expect(screen.getByTestId('artifacts-table')).toBeInTheDocument();
  });

  it('should display REST errors rather than treating them as an empty result', () => {
    useGetArtifactsListMock.mockReturnValue([undefined, false, new Error('Failed'), jest.fn()]);
    render(<ArtifactsList />);
    expect(screen.getByText('There was an issue loading artifacts')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('should use the next-page token and reset pagination when a filter changes', () => {
    useGetArtifactsListMock.mockReturnValue([
      {
        artifacts: [{ artifact_id: 'id', name: 'one', type: PipelineArtifactTypeKF.DATASET }],
        next_page_token: 'token-2',
      },
      true,
      undefined,
      jest.fn(),
    ]);
    render(<ArtifactsList />);
    expect(useGetArtifactsListMock).toHaveBeenLastCalledWith(undefined, 10, undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(useGetArtifactsListMock).toHaveBeenLastCalledWith('token-2', 10, undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    expect(useGetArtifactsListMock).toHaveBeenLastCalledWith(
      undefined,
      10,
      JSON.stringify({
        predicates: [{ key: 'name', operation: 'IS_SUBSTRING', string_value: 'filtered' }],
      }),
    );
  });

  it('should keep the filter toolbar mounted while a new filtered request loads', () => {
    const artifact = { artifact_id: 'id', name: 'one', type: PipelineArtifactTypeKF.DATASET };
    useGetArtifactsListMock.mockImplementation((_token, _size, filter) =>
      filter
        ? [undefined, false, undefined, jest.fn()]
        : [{ artifacts: [artifact] }, true, undefined, jest.fn()],
    );
    render(<ArtifactsList />);
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    expect(screen.getByTestId('artifacts-table')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
  });

  it('should offer recovery from filter errors', () => {
    const artifact = { artifact_id: 'id', name: 'one', type: PipelineArtifactTypeKF.DATASET };
    useGetArtifactsListMock.mockImplementation((_token, _size, filter) =>
      filter
        ? [undefined, false, new Error('Unsupported filter'), jest.fn()]
        : [{ artifacts: [artifact] }, true, undefined, jest.fn()],
    );
    render(<ArtifactsList />);
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    expect(screen.getByText('Unsupported filter')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByTestId('artifacts-table')).toBeInTheDocument();
  });

  it('should render unauthorized state for gRPC permission failures', () => {
    useGetArtifactsListMock.mockReturnValue([
      undefined,
      false,
      Object.assign(new Error('Permission denied'), { grpcCode: 7 }),
      jest.fn(),
    ]);
    render(<ArtifactsList />);
    expect(screen.getByTestId('unauthorized-error')).toBeInTheDocument();
  });
});
