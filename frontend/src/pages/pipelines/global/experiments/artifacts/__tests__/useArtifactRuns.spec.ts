/* eslint-disable camelcase */
import { waitFor } from '@testing-library/react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { Artifact } from '#~/third_party/mlmd';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { buildMockRunKF } from '#~/__mocks__/mockRunKF';
import {
  isGrpcNotFoundError,
  isPipelineRunKF,
  useArtifactRuns,
} from '#~/pages/pipelines/global/experiments/artifacts/useArtifactRuns';

jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
}));

const RUN_A = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const RUN_B = '11111111-2222-3333-4444-555555555555';

const artifactWithRun = (runId: string): Artifact =>
  ({
    getUri: () => `s3://bucket/pipeline/${runId}/task/artifact`,
  } as unknown as Artifact);

describe('useArtifactRuns gRPC error detection', () => {
  it('should detect gRPC NOT_FOUND error (code 5)', () => {
    const grpcNotFound = {
      code: 5,
      message: 'Run not found',
      details: [{ '@type': 'type.googleapis.com/google.rpc.Status', code: 5 }],
    };

    expect(isGrpcNotFoundError(grpcNotFound)).toBe(true);
  });

  it('should not treat valid run as gRPC error', () => {
    const validRun: Partial<PipelineRunKF> = {
      run_id: 'run-123',
      display_name: 'Test Run',
      experiment_id: 'exp-456',
    };

    expect(isGrpcNotFoundError(validRun)).toBe(false);
  });

  it('should not treat other gRPC codes as NOT_FOUND', () => {
    const grpcCancelled = { code: 1, message: 'cancelled', details: [] };

    expect(isGrpcNotFoundError(grpcCancelled)).toBe(false);
  });
});

describe('isPipelineRunKF', () => {
  it('should accept a run with string run_id and display_name', () => {
    expect(
      isPipelineRunKF({
        run_id: RUN_A,
        display_name: 'Test Run',
      }),
    ).toBe(true);
  });

  it('should reject a gRPC error object', () => {
    expect(isPipelineRunKF({ code: 5, message: 'Run not found' })).toBe(false);
  });

  it('should reject a run with a non-string run_id or display_name', () => {
    expect(isPipelineRunKF({ run_id: 123, display_name: 'Test Run' })).toBe(false);
    expect(isPipelineRunKF({ run_id: RUN_A, display_name: { name: 'Test Run' } })).toBe(false);
    expect(isPipelineRunKF({ run_id: RUN_A })).toBe(false);
  });
});

describe('useArtifactRuns', () => {
  const mockGetPipelineRun = jest.fn();
  const mockUsePipelinesAPI = jest.mocked(usePipelinesAPI);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePipelinesAPI.mockReturnValue({
      api: { getPipelineRun: mockGetPipelineRun },
    } as unknown as ReturnType<typeof usePipelinesAPI>);
  });

  it('should evict cached runs and errors that are no longer referenced', async () => {
    const runA = buildMockRunKF({ run_id: RUN_A, display_name: 'Run A' });
    const runB = buildMockRunKF({ run_id: RUN_B, display_name: 'Run B' });
    mockGetPipelineRun.mockImplementation((_opts: unknown, id: string) =>
      Promise.resolve(id === RUN_A ? runA : runB),
    );

    const renderResult = testHook(useArtifactRuns)([artifactWithRun(RUN_A)]);
    await waitFor(() => {
      expect(renderResult.result.current.runs[RUN_A]).toEqual(runA);
    });

    renderResult.rerender([artifactWithRun(RUN_B)]);

    expect(renderResult.result.current.runs[RUN_A]).toBeUndefined();
    await waitFor(() => {
      expect(renderResult.result.current.runs[RUN_B]).toEqual(runB);
    });
    expect(renderResult.result.current.runs).toEqual({ [RUN_B]: runB });
  });

  it('should keep overlapping run IDs without refetching', async () => {
    const runA = buildMockRunKF({ run_id: RUN_A, display_name: 'Run A' });
    const runB = buildMockRunKF({ run_id: RUN_B, display_name: 'Run B' });
    mockGetPipelineRun.mockImplementation((_opts: unknown, id: string) =>
      Promise.resolve(id === RUN_A ? runA : runB),
    );

    const renderResult = testHook(useArtifactRuns)([artifactWithRun(RUN_A)]);
    await waitFor(() => {
      expect(renderResult.result.current.runs[RUN_A]).toEqual(runA);
    });
    expect(mockGetPipelineRun).toHaveBeenCalledTimes(1);

    renderResult.rerender([artifactWithRun(RUN_A), artifactWithRun(RUN_B)]);
    await waitFor(() => {
      expect(renderResult.result.current.runs[RUN_B]).toEqual(runB);
    });

    expect(renderResult.result.current.runs[RUN_A]).toEqual(runA);
    expect(mockGetPipelineRun.mock.calls.map(([, id]) => id)).toEqual([RUN_A, RUN_B]);
  });

  it('should clear the cache when artifacts become empty', async () => {
    const runA = buildMockRunKF({ run_id: RUN_A, display_name: 'Run A' });
    mockGetPipelineRun.mockResolvedValue(runA);

    const renderResult = testHook(useArtifactRuns)([artifactWithRun(RUN_A)]);
    await waitFor(() => {
      expect(renderResult.result.current.runs[RUN_A]).toEqual(runA);
    });

    renderResult.rerender([]);
    expect(renderResult.result.current.runs).toEqual({});
    expect(renderResult.result.current.errors).toEqual({});
    expect(renderResult.result.current.loading.size).toBe(0);
  });

  it('should reject a response whose run_id does not match the requested run', async () => {
    mockGetPipelineRun.mockResolvedValue(
      buildMockRunKF({ run_id: RUN_B, display_name: 'Wrong run' }),
    );

    const renderResult = testHook(useArtifactRuns)([artifactWithRun(RUN_A)]);
    await waitFor(() => {
      expect(renderResult.result.current.errors[RUN_A]).toBeDefined();
    });
    expect(renderResult.result.current.errors[RUN_A].message).toBe(
      'Invalid response from pipeline API',
    );
    expect(renderResult.result.current.runs[RUN_A]).toBeUndefined();
  });
});
