import { standardUseFetchState, testHook } from '~/__tests__/unit/testUtils/hooks';
import usePipelineQuery, {
  PipelineKFCallCommonWithItems,
} from '~/concepts/pipelines/apiHooks/usePipelineQuery';
import { PipelineCoreResourceKFv2, PipelinesFilterOp } from '~/concepts/pipelines/kfTypes';

const createMockItems = (count: number, prefix = 'item'): PipelineCoreResourceKFv2[] =>
  new Array(count).fill(null).map((_, i) => ({
    // eslint-disable-next-line camelcase
    created_at: `${prefix}-created_at-${i}`,
    // eslint-disable-next-line camelcase
    display_name: `${prefix}-name-${i}`,
  }));

type APIResult = PipelineKFCallCommonWithItems<PipelineCoreResourceKFv2>;
const createMockResult = (
  items: PipelineCoreResourceKFv2[],
  totalSize?: number | boolean,
  nextPageToken?: string,
): APIResult => ({
  items,
  // eslint-disable-next-line camelcase
  total_size: totalSize === true ? items.length : totalSize === false ? undefined : totalSize,
  // eslint-disable-next-line camelcase
  next_page_token: nextPageToken,
});

describe('usePipelineQuery', () => {
  it('should return an error', async () => {
    const renderResult = testHook(usePipelineQuery)(() => Promise.reject(new Error('test error')));
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState({ totalSize: 0, items: [] }, false, new Error('test error')),
    );
  });

  it('should send request options', async () => {
    let mockItems = createMockItems(1);
    let apiResult: APIResult = createMockResult(mockItems);
    const promiseCallback = jest.fn(() => Promise.resolve(apiResult));
    const renderResult = testHook(usePipelineQuery)(promiseCallback, {
      filter: {
        predicates: [
          {
            operation: PipelinesFilterOp.EQUALS,
            key: 'name',
            // eslint-disable-next-line camelcase
            string_value: 'test',
          },
        ],
      },
      page: 1,
      pageSize: 2,
      sortDirection: 'asc',
      sortField: 'name',
    });
    await renderResult.waitForNextUpdate();

    expect(promiseCallback).toHaveBeenCalledTimes(1);
    expect(promiseCallback).toHaveBeenCalledWith(expect.anything(), {
      filter: {
        predicates: [
          {
            key: 'name',
            operation: 'EQUALS',
            // eslint-disable-next-line camelcase
            string_value: 'test',
          },
        ],
      },
      pageSize: 2,
      pageToken: undefined,
      sortDirection: 'asc',
      sortField: 'name',
    });
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState({ totalSize: 1, items: mockItems, nextPageToken: undefined }, true),
    );

    // update our mock to return a new set of values
    mockItems = createMockItems(2);
    apiResult = createMockResult(mockItems, 4);

    // refresh
    renderResult.result.current[3]();
    await renderResult.waitForNextUpdate();

    expect(promiseCallback).toHaveBeenCalledTimes(2);
    expect(promiseCallback.mock.calls[1]).toEqual([
      expect.anything(),
      {
        filter: {
          predicates: [
            {
              key: 'name',
              operation: 'EQUALS',
              // eslint-disable-next-line camelcase
              string_value: 'test',
            },
          ],
        },
        pageSize: 2,
        pageToken: undefined,
        sortDirection: 'asc',
        sortField: 'name',
      },
    ]);

    expect(renderResult).hookToStrictEqual(
      standardUseFetchState({ totalSize: 4, items: mockItems, nextPageToken: undefined }, true),
    );
  });

  //   it('should return the previous total size when any option other than filter changes', () => {});

  it('should return cached size while fetching new items', async () => {
    const promiseCallback = () => Promise.resolve(createMockResult(createMockItems(2)));
    const renderResult = testHook(usePipelineQuery)(promiseCallback);
    expect(renderResult.result.current[0]).toEqual(expect.objectContaining({ totalSize: 0 }));
    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current[0]).toEqual(expect.objectContaining({ totalSize: 2 }));

    renderResult.rerender(promiseCallback, { sortDirection: 'asc' });
    expect(renderResult.result.current[0]).toEqual(expect.objectContaining({ totalSize: 2 }));
    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current[0]).toEqual(expect.objectContaining({ totalSize: 2 }));
  });

  it('should reset total size when filter changes', async () => {
    const promiseCallback = () => Promise.resolve(createMockResult(createMockItems(2)));
    const renderResult = testHook(usePipelineQuery)(promiseCallback);
    expect(renderResult.result.current[0]).toEqual(expect.objectContaining({ totalSize: 0 }));
    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current[0]).toEqual(expect.objectContaining({ totalSize: 2 }));

    renderResult.rerender(promiseCallback, {
      filter: {
        predicates: [
          {
            operation: PipelinesFilterOp.EQUALS,
            key: 'name',
            // eslint-disable-next-line camelcase
            string_value: 'test',
          },
        ],
      },
    });
    expect(renderResult.result.current[0]).toEqual(expect.objectContaining({ totalSize: 0 }));
    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current[0]).toEqual(expect.objectContaining({ totalSize: 2 }));
  });

  it('should query subsequent page with next page token', async () => {
    const page1Items = createMockItems(2, 'page1');
    const page2Items = createMockItems(2, 'page2');
    const page3Items = createMockItems(1, 'page3');

    // go to page 1
    let apiResult: APIResult = createMockResult(page1Items, 5, 'gotopage2');
    const promiseCallback = jest.fn(() => Promise.resolve(apiResult));
    const renderResult = testHook(usePipelineQuery)(promiseCallback, { page: 1, pageSize: 2 });
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState({ items: page1Items, totalSize: 5, nextPageToken: 'gotopage2' }, true),
    );

    // go to page 2
    apiResult = createMockResult(page2Items, 5, 'gotopage3');
    renderResult.rerender(promiseCallback, { page: 2, pageSize: 2 });
    await renderResult.waitForNextUpdate();
    expect(promiseCallback.mock.calls[1]).toEqual([
      expect.anything(),
      { pageToken: 'gotopage2', pageSize: 2 },
    ]);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState({ items: page2Items, totalSize: 5, nextPageToken: 'gotopage3' }, true),
    );

    // go to page 3
    apiResult = createMockResult(page3Items, 5);
    renderResult.rerender(promiseCallback, { page: 3, pageSize: 2 });
    await renderResult.waitForNextUpdate();
    expect(promiseCallback.mock.calls[2]).toEqual([
      expect.anything(),
      { pageToken: 'gotopage3', pageSize: 2 },
    ]);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState({ items: page3Items, totalSize: 5, nextPageToken: undefined }, true),
    );

    // go back to page 2
    apiResult = createMockResult(page2Items, 5, 'gotopage3');
    renderResult.rerender(promiseCallback, { page: 2, pageSize: 2 });
    await renderResult.waitForNextUpdate();
    expect(promiseCallback.mock.calls[3]).toEqual([
      expect.anything(),
      { pageToken: 'gotopage2', pageSize: 2 },
    ]);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState({ items: page2Items, totalSize: 5, nextPageToken: 'gotopage3' }, true),
    );

    // go back to page 1
    apiResult = createMockResult(page1Items, 5, 'gotopage2');
    renderResult.rerender(promiseCallback, { page: 1, pageSize: 2 });
    await renderResult.waitForNextUpdate();
    expect(promiseCallback.mock.calls[4]).toEqual([expect.anything(), { pageSize: 2 }]);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState({ items: page1Items, totalSize: 5, nextPageToken: 'gotopage2' }, true),
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
