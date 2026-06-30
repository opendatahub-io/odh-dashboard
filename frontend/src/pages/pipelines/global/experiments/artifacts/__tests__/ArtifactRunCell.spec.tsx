/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { Artifact } from '#~/third_party/mlmd';
import * as usePipelineRunById from '#~/concepts/pipelines/apiHooks/usePipelineRunById';
import { PipelineAPIError } from '#~/api/pipelines/errorUtils';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import ArtifactRunCell from '#~/pages/pipelines/global/experiments/artifacts/ArtifactRunCell';

// Mock the pipelines context
jest.mock('#~/concepts/pipelines/context/PipelinesContext', () => ({
  usePipelinesAPI: jest.fn(() => ({
    namespace: 'test-namespace',
    api: {},
  })),
}));

// Mock the hook
jest.mock('#~/concepts/pipelines/apiHooks/usePipelineRunById');

const usePipelineRunByIdMock = jest.mocked(usePipelineRunById.default);

describe('ArtifactRunCell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show dash when URI has no UUID in run position', () => {
    const mockArtifact = {
      getUri: jest.fn(() => 's3://bucket/some/path/without/uuid'),
    } as unknown as Artifact;

    usePipelineRunByIdMock.mockReturnValue([null, true, undefined, jest.fn()]);

    render(
      <BrowserRouter>
        <ArtifactRunCell artifact={mockArtifact} />
      </BrowserRouter>,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should extract run ID from correct position even when pipeline name contains UUID', () => {
    const pipelineUuid = '11111111-2222-3333-4444-555555555555';
    const runUuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const mockArtifact = {
      getUri: jest.fn(() => `s3://bucket/pipeline-${pipelineUuid}/${runUuid}/task/artifact`),
    } as unknown as Artifact;

    const mockRun: Partial<PipelineRunKF> = {
      run_id: runUuid,
      display_name: 'Test Run from correct UUID',
      experiment_id: 'exp-123',
    };

    usePipelineRunByIdMock.mockReturnValue([mockRun as PipelineRunKF, true, undefined, jest.fn()]);

    render(
      <BrowserRouter>
        <ArtifactRunCell artifact={mockArtifact} />
      </BrowserRouter>,
    );

    // Should display the run name, proving it extracted the correct UUID (segment 2, not segment 1)
    expect(screen.getByText('Test Run from correct UUID')).toBeInTheDocument();
  });

  it('should show dash when URI is empty', () => {
    const mockArtifact = {
      getUri: jest.fn(() => ''),
    } as unknown as Artifact;

    usePipelineRunByIdMock.mockReturnValue([null, true, undefined, jest.fn()]);

    render(
      <BrowserRouter>
        <ArtifactRunCell artifact={mockArtifact} />
      </BrowserRouter>,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should show skeleton while loading run details', () => {
    const mockArtifact = {
      getUri: jest.fn(
        () => 's3://bucket/pipeline/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/task/artifact',
      ),
    } as unknown as Artifact;

    usePipelineRunByIdMock.mockReturnValue([null, false, undefined, jest.fn()]);

    const { container } = render(
      <BrowserRouter>
        <ArtifactRunCell artifact={mockArtifact} />
      </BrowserRouter>,
    );

    expect(container.querySelector('.pf-v6-c-skeleton')).toBeInTheDocument();
  });

  it('should show dash when run is deleted (404)', () => {
    const mockArtifact = {
      getUri: jest.fn(
        () => 's3://bucket/pipeline/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/task/artifact',
      ),
    } as unknown as Artifact;

    // Simulate a 404 PipelineAPIError (run deleted)
    const error404 = new PipelineAPIError('Run not found', 404);

    // When there's an error, loaded is typically true (the fetch completed)
    usePipelineRunByIdMock.mockReturnValue([null, true, error404, jest.fn()]);

    render(
      <BrowserRouter>
        <ArtifactRunCell artifact={mockArtifact} />
      </BrowserRouter>,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should show run ID when run details fail to load with server error (500)', () => {
    const mockArtifact = {
      getUri: jest.fn(
        () => 's3://bucket/pipeline/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/task/artifact',
      ),
    } as unknown as Artifact;

    // Simulate a 500 PipelineAPIError (server error)
    const error500 = new PipelineAPIError('Internal server error', 500);

    // When there's an error, loaded is typically true (the fetch completed)
    usePipelineRunByIdMock.mockReturnValue([null, true, error500, jest.fn()]);

    const { container } = render(
      <BrowserRouter>
        <ArtifactRunCell artifact={mockArtifact} />
      </BrowserRouter>,
    );

    expect(container.textContent).toContain('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d');
  });

  it('should show display name as link to global run route', () => {
    const mockArtifact = {
      getUri: jest.fn(
        () => 's3://bucket/pipeline/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/task/artifact',
      ),
    } as unknown as Artifact;

    const mockRun: Partial<PipelineRunKF> = {
      run_id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
      display_name: 'My Test Run',
      // No experiment_id - should link to global run route
    };

    usePipelineRunByIdMock.mockReturnValue([mockRun as PipelineRunKF, true, undefined, jest.fn()]);

    render(
      <BrowserRouter>
        <ArtifactRunCell artifact={mockArtifact} />
      </BrowserRouter>,
    );

    const link = screen.getByRole('link');
    expect(link).toHaveTextContent('My Test Run');
    expect(link).toHaveAttribute(
      'href',
      '/develop-train/pipelines/runs/test-namespace/runs/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    );
  });

  it('should show display name as link when run is fully loaded', () => {
    const mockArtifact = {
      getUri: jest.fn(
        () => 's3://bucket/pipeline/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/task/artifact',
      ),
    } as unknown as Artifact;

    const mockRun: Partial<PipelineRunKF> = {
      run_id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
      display_name: 'My Test Run',
      experiment_id: 'test-experiment-id',
    };

    usePipelineRunByIdMock.mockReturnValue([mockRun as PipelineRunKF, true, undefined, jest.fn()]);

    render(
      <BrowserRouter>
        <ArtifactRunCell artifact={mockArtifact} />
      </BrowserRouter>,
    );

    const link = screen.getByRole('link');
    expect(link).toHaveTextContent('My Test Run');
    // Always uses global route since we're on the global artifacts page
    expect(link).toHaveAttribute(
      'href',
      '/develop-train/pipelines/runs/test-namespace/runs/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    );
  });
});
