/* eslint-disable camelcase */
import { handlePipelineFailures } from '#~/api/pipelines/errorUtils';
import { mockPipelineKF } from '#~/__mocks__/mockPipelineKF';
import { NotReadyError } from '#~/utilities/useFetchState';

describe('handlePipelineFailures', () => {
  it('should successfully return pipeline', async () => {
    const pipelineMock = mockPipelineKF({});
    const result = await handlePipelineFailures(Promise.resolve(pipelineMock));
    expect(result).toStrictEqual(pipelineMock);
  });

  it('should handle and throw KF errors with gRPC code', async () => {
    const statusMock = { error: 'error', code: 5, message: 'not-found' };

    await expect(handlePipelineFailures(Promise.resolve(statusMock))).rejects.toMatchObject({
      message: 'error',
      response: { status: 404 }, // gRPC 5 → HTTP 404
    });
  });

  it('should handle and throw KF errors with HTTP status code', async () => {
    const statusMock = { error: 'error', code: 404, message: 'not-found' };

    await expect(handlePipelineFailures(Promise.resolve(statusMock))).rejects.toMatchObject({
      message: 'error',
      response: { status: 404 }, // HTTP 404 → HTTP 404
    });
  });

  it('should handle error details', async () => {
    const statusMock = {
      error_details: 'not-found',
      error_message: 'not-found',
    };

    await expect(handlePipelineFailures(Promise.resolve(statusMock))).rejects.toThrow('not-found');
  });

  it('should handle common state errors ', async () => {
    await expect(
      handlePipelineFailures(Promise.reject(new NotReadyError('error'))),
    ).rejects.toThrow('error');
  });

  it('should handle other errors', async () => {
    await expect(handlePipelineFailures(Promise.reject(new Error('error')))).rejects.toThrow(
      'Error communicating with pipeline server',
    );
  });

  it('should reject malformed KF errors with non-string error field', async () => {
    const malformedMock = { error: 123, code: 5, message: 'not-found' };

    // Should not be treated as ErrorKF due to wrong type for error field
    const result = await handlePipelineFailures(Promise.resolve(malformedMock));
    expect(result).toStrictEqual(malformedMock);
  });

  it('should accept KF errors without error field', async () => {
    const validMock = { code: 5, message: 'not-found', details: [] };

    await expect(handlePipelineFailures(Promise.resolve(validMock))).rejects.toThrow('not-found');
  });
});
