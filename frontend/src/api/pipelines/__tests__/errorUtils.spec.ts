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
});
