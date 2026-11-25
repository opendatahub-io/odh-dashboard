/* eslint-disable camelcase */
import * as React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import { useGetArtifactById } from '#~/concepts/pipelines/apiHooks/useGetArtifactById';
import { PipelineArtifactTypeKF } from '#~/concepts/pipelines/kfTypes';
import { ArtifactDetails } from '#~/pages/pipelines/global/experiments/artifacts/ArtifactDetails/ArtifactDetails';
import { ArtifactOverviewDetails } from '#~/pages/pipelines/global/experiments/artifacts/ArtifactDetails/ArtifactOverviewDetails';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(() => ({ status: false })),
}));
jest.mock('#~/components/MaxHeightCodeEditor', () => ({
  MaxHeightCodeEditor: ({ code }: { code: string }) => <pre>{code}</pre>,
}));
jest.mock('#~/concepts/pipelines/apiHooks/useGetArtifactById', () => ({
  useGetArtifactById: jest.fn(),
}));
jest.mock('@odh-dashboard/ui-core/components/UnauthorizedError', () => ({
  __esModule: true,
  default: () => <div data-testid="unauthorized-error" />,
}));
jest.mock('#~/concepts/pipelines/content/PipelineContextBreadcrumb', () => ({
  __esModule: true,
  default: ({ children }: React.PropsWithChildren) => <nav>{children}</nav>,
}));
jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ApplicationsPage: ({
    title,
    breadcrumb,
    children,
  }: React.PropsWithChildren<{ title: React.ReactNode; breadcrumb: React.ReactNode }>) => (
    <>
      <header>{title}</header>
      {breadcrumb}
      {children}
    </>
  ),
}));

describe('ArtifactDetails', () => {
  const useGetArtifactByIdMock = jest.mocked(useGetArtifactById);

  beforeEach(() => jest.clearAllMocks());

  it('should load REST detail with the route ID and show its name', () => {
    useGetArtifactByIdMock.mockReturnValue([
      { artifact_id: 'uuid-1', name: 'test artifact', type: PipelineArtifactTypeKF.DATASET },
      true,
      undefined,
      jest.fn(),
    ]);
    render(
      <MemoryRouter initialEntries={['/artifacts/uuid-1']}>
        <Routes>
          <Route
            path="/artifacts/:artifactId"
            element={<ArtifactDetails breadcrumbPath={[]} contextPath="/artifacts" />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(useGetArtifactByIdMock).toHaveBeenCalledWith('uuid-1');
    expect(screen.getAllByText('test artifact')).toHaveLength(2);
  });

  it('should display REST detail errors', () => {
    useGetArtifactByIdMock.mockReturnValue([undefined, false, new Error('Not found'), jest.fn()]);
    render(
      <MemoryRouter initialEntries={['/artifacts/missing']}>
        <Routes>
          <Route
            path="/artifacts/:artifactId"
            element={<ArtifactDetails breadcrumbPath={[]} contextPath="/artifacts" />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Error loading artifact details')).toBeInTheDocument();
    expect(screen.getByText('Not found')).toBeInTheDocument();
  });

  it('should show unauthorized state for REST permission errors', () => {
    useGetArtifactByIdMock.mockReturnValue([
      undefined,
      false,
      Object.assign(new Error('Permission denied'), { grpcCode: 7 }),
      jest.fn(),
    ]);
    render(
      <MemoryRouter initialEntries={['/artifacts/uuid-1']}>
        <Routes>
          <Route
            path="/artifacts/:artifactId"
            element={<ArtifactDetails breadcrumbPath={[]} contextPath="/artifacts" />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('unauthorized-error')).toBeInTheDocument();
  });
});

describe('ArtifactOverviewDetails', () => {
  it('should display resource URI and metadata including zero, false, and nested values', () => {
    render(
      <ArtifactOverviewDetails
        artifact={{
          artifact_id: 'uuid',
          name: 'dataset',
          type: PipelineArtifactTypeKF.DATASET,
          uri: 's3://bucket/dataset',
          metadata: { count: 0, active: false, columns: ['age', 'name'] },
        }}
      />,
    );
    expect(
      within(screen.getByTestId('dataset-description-list')).getByText('s3://bucket/dataset'),
    ).toBeInTheDocument();
    const list = screen.getByTestId('artifact-metadata-list');
    expect(within(list).getByText('0')).toBeInTheDocument();
    expect(within(list).getByText('false')).toBeInTheDocument();
    expect(within(list).getByText(/"age"/)).toBeInTheDocument();
    expect(screen.queryByText('Reference')).not.toBeInTheDocument();
  });

  it('should show a helpful empty state when optional resource fields are omitted', () => {
    render(
      <ArtifactOverviewDetails
        artifact={{ artifact_id: 'uuid', name: 'plain', type: PipelineArtifactTypeKF.ARTIFACT }}
      />,
    );
    expect(screen.getByText('No metadata')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('dataset-description-list')).getByText('—'),
    ).toBeInTheDocument();
  });
});
