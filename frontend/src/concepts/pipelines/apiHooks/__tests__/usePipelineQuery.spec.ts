import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import usePipelineQuery from '#~/concepts/pipelines/apiHooks/usePipelineQuery';

describe('usePipelineQuery', () => {
  it('should return an error', async () => {
    const renderResult = testHook(usePipelineQuery)(() => Promise.reject(new Error('test error')));
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState({ totalSize: 0, items: [] }, false, new Error('test error')),
    );
  });

  it('should error out requesting invalid page', async () => {
    const renderResult = testHook(usePipelineQuery)(() => Promise.resolve({}), {
      page: 10,
    });

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(
        { items: [], totalSize: 0 },
        false,
        new Error('No token available for page 10.'),
      ),
    );
  });
});
