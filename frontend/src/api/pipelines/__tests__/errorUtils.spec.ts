/* eslint-disable camelcase */
import { NotReadyError } from '@odh-dashboard/ui-core/hooks/useFetchState';
import { handlePipelineFailures, PipelineAPIError } from '#~/api/pipelines/errorUtils';
import { mockPipelineKF } from '#~/__mocks__/mockPipelineKF';

describe('PipelineAPIError', () => {
  it('should keep finite integer status values', () => {
    expect(new PipelineAPIError('not found', 404).response.status).toBe(404);
    expect(new PipelineAPIError('not found', '404').response.status).toBe(404);
    expect(new PipelineAPIError('not found', ' 403 ').response.status).toBe(403);
    expect(new PipelineAPIError('not found', '404.5').response.status).toBe(404);
  });

  it('should fall back to 500 for invalid status values', () => {
    expect(new PipelineAPIError('error', Number.NaN).response.status).toBe(500);
    expect(new PipelineAPIError('error', Number.POSITIVE_INFINITY).response.status).toBe(500);
    expect(new PipelineAPIError('error', Number.NEGATIVE_INFINITY).response.status).toBe(500);
    expect(new PipelineAPIError('error', 404.5).response.status).toBe(500);
    expect(new PipelineAPIError('error', '').response.status).toBe(500);
    expect(new PipelineAPIError('error', '   ').response.status).toBe(500);
    expect(new PipelineAPIError('error', 'not-a-status').response.status).toBe(500);
    // Runtime callers may pass null despite the constructor type
    expect(new PipelineAPIError('error', null as unknown as number).response.status).toBe(500);
  });
});

describe('handlePipelineFailures', () => {
  it('should successfully return pipeline', async () => {
    const pipelineMock = mockPipelineKF({});
    const result = await handlePipelineFailures(Promise.resolve(pipelineMock));
    expect(result).toStrictEqual(pipelineMock);
  });

  it('should handle and throw KF errors', async () => {
    const statusMock = { error: 'error', code: '404', message: 'not-found' };

    await expect(handlePipelineFailures(Promise.resolve(statusMock))).rejects.toMatchObject({
      message: 'error',
      response: { status: 404 },
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
