import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as useGetArtifactsList from '#~/concepts/pipelines/apiHooks/mlmd/useGetArtifactsList';
import * as MlmdListContext from '#~/concepts/pipelines/context/MlmdListContext';
import { ArtifactsList } from '#~/pages/pipelines/global/experiments/artifacts/ArtifactsList';

jest.mock('#~/api/errorUtils', () => ({
  getGenericErrorCode: jest.fn(() => null),
}));

jest.mock('#~/pages/UnauthorizedError', () => {
  const UnauthorizedError = () => <div data-testid="unauthorized-error" />;
  return { __esModule: true, default: UnauthorizedError };
});

jest.mock('../ArtifactsTable', () => ({
  ArtifactsTable: () => <div data-testid="artifacts-table" />,
}));

describe('ArtifactsList', () => {
  const useGetArtifactsListSpy = jest.spyOn(useGetArtifactsList, 'useGetArtifactsList');
  const useMlmdListContextSpy = jest.spyOn(MlmdListContext, 'useMlmdListContext');

  beforeEach(() => {
    jest.clearAllMocks();

    useMlmdListContextSpy.mockReturnValue({
      filterQuery: '',
      pageToken: '',
      maxResultSize: 10,
      orderBy: undefined,
      setFilterQuery: jest.fn(),
      setPageToken: jest.fn(),
      setMaxResultSize: jest.fn(),
      setOrderBy: jest.fn(),
    });
  });

  it('should show empty state when there are no artifacts', () => {
    useGetArtifactsListSpy.mockReturnValue([
      { artifacts: [], nextPageToken: '' },
      true,
      undefined,
      jest.fn(),
    ]);

    render(<ArtifactsList />);

    expect(screen.getByTestId('artifacts-list-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No artifacts')).toBeInTheDocument();
    expect(screen.queryByTestId('artifacts-table')).not.toBeInTheDocument();
  });

  it('should show error state when artifacts fail to load', () => {
    useGetArtifactsListSpy.mockReturnValue([
      undefined,
      false,
      new Error('Failed to fetch'),
      jest.fn(),
    ]);

    render(<ArtifactsList />);

    expect(screen.getByText('There was an issue loading artifacts')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    expect(screen.queryByTestId('artifacts-table')).not.toBeInTheDocument();
  });
});
