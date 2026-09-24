/* eslint-disable camelcase */
import { NotReadyError } from '@odh-dashboard/ui-core/hooks/useFetchState';
import { handlePipelineFailures } from '#~/api/pipelines/errorUtils';
import { mockPipelineKF } from '#~/__mocks__/mockPipelineKF';

describe('handlePipelineFailures', () => {
  it('should successfully return pipeline', async () => {
    const pipelineMock = mockPipelineKF({});
    const result = await handlePipelineFailures(Promise.resolve(pipelineMock));
    expect(result).toStrictEqual(pipelineMock);
  });

  it('should handle and throw KF errors', async () => {
    const statusMock = { error: 'error', code: '404', message: 'not-found' };

    await expect(handlePipelineFailures(Promise.resolve(statusMock))).rejects.toThrow('error');
  });

  it('should handle error details', async () => {
    const statusMock = {
      error_details: 'not-found',
      error_message: 'not-found',
    };

    await expect(handlePipelineFailures(Promise.resolve(statusMock))).rejects.toThrow('not-found');
  });

  it('should throw a GrpcError with grpcCode and result for gRPC error responses', async () => {
    const grpcErrorResponse = { code: 5, message: 'Run not found' };

    const error: unknown = await handlePipelineFailures(Promise.resolve(grpcErrorResponse)).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty('grpcCode', 5);
    expect(error).toHaveProperty('result', grpcErrorResponse);
  });

  it('should preserve the original result on GrpcError for non-NOT_FOUND(5) gRPC codes', async () => {
    const grpcErrorResponse = { code: 1, message: 'Cancelled by caller', details: [] };

    const error: unknown = await handlePipelineFailures(Promise.resolve(grpcErrorResponse)).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty('grpcCode', 1);
    expect(error).toHaveProperty('result', grpcErrorResponse);
  });

  it('should handle common state errors ', async () => {
    await expect(
      handlePipelineFailures(Promise.reject(new NotReadyError('error'))),
    ).rejects.toThrow('error');
  });

  it('should re-throw the same Error instance', async () => {
    const original = new Error('error');
    await expect(handlePipelineFailures(Promise.reject(original))).rejects.toBe(original);
  });

  it('should wrap non-Error rejections in a generic message', async () => {
    await expect(handlePipelineFailures(Promise.reject('string error'))).rejects.toThrow(
      'Error communicating with pipeline server',
    );
  });
});
