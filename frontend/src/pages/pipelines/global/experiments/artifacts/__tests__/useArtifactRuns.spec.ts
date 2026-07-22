/* eslint-disable camelcase */
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { isGrpcNotFoundError } from '#~/pages/pipelines/global/experiments/artifacts/useArtifactRuns';

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
