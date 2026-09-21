import { getMcpServerConverter, getMcpServerToolsList } from '~/app/api/mcpServerCatalog';
import { mockMcpDeploySpec, mockMcpTool, mockMcpToolList } from '~/__mocks__/mockMcpCatalog';
import { standardUseFetchState, testHook } from '~/__tests__/unit/testUtils/hooks';
import { useMcpServerConverter, useMcpServerToolList } from '~/app/hooks/useMcpServerCatalog';

jest.mock('~/app/api/mcpServerCatalog', () => ({
  getMcpServerToolsList: jest.fn(),
  getMcpServerConverter: jest.fn(),
}));

const mockGetMcpServerToolsList = jest.mocked(getMcpServerToolsList);
const mockGetMcpServerConverter = jest.mocked(getMcpServerConverter);

describe('useMcpServerToolList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not fetch when server id is missing', () => {
    const fetchPage = jest.fn();
    mockGetMcpServerToolsList.mockReturnValue(fetchPage);

    const renderResult = testHook(useMcpServerToolList)('', 'odh-model-registries');

    expect(renderResult).hookToStrictEqual(standardUseFetchState(mockMcpToolList()));
    expect(renderResult).hookToHaveUpdateCount(1);
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('should not fetch when catalog namespace is missing', () => {
    const fetchPage = jest.fn();
    mockGetMcpServerToolsList.mockReturnValue(fetchPage);

    const renderResult = testHook(useMcpServerToolList)('server-1', '');

    expect(renderResult).hookToStrictEqual(standardUseFetchState(mockMcpToolList()));
    expect(renderResult).hookToHaveUpdateCount(1);
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('should walk pagination tokens and return the concatenated tool list', async () => {
    const pageFetch = jest
      .fn()
      .mockResolvedValueOnce(
        mockMcpToolList({
          items: [{ serverId: 'server-1', tool: mockMcpTool({ name: 'list_pods' }) }],
          nextPageToken: 'page-2',
        }),
      )
      .mockResolvedValueOnce(
        mockMcpToolList({
          items: [{ serverId: 'server-1', tool: mockMcpTool({ name: 'get_logs' }) }],
          nextPageToken: '  ',
        }),
      );
    mockGetMcpServerToolsList.mockReturnValue(pageFetch);

    const renderResult = testHook(useMcpServerToolList)('server-1', 'odh-model-registries');
    await renderResult.waitForNextUpdate();

    expect(mockGetMcpServerToolsList).toHaveBeenNthCalledWith(1, {
      namespace: 'odh-model-registries',
      pageSize: 100,
    });
    expect(mockGetMcpServerToolsList).toHaveBeenNthCalledWith(2, {
      namespace: 'odh-model-registries',
      pageSize: 100,
      nextPageToken: 'page-2',
    });
    expect(pageFetch).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(
        mockMcpToolList({
          items: [
            { serverId: 'server-1', tool: mockMcpTool({ name: 'list_pods' }) },
            { serverId: 'server-1', tool: mockMcpTool({ name: 'get_logs' }) },
          ],
          size: 2,
          pageSize: 2,
        }),
        true,
      ),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should surface an error when pagination exceeds the maximum page count', async () => {
    const pageFetch = jest.fn().mockResolvedValue(
      mockMcpToolList({
        items: [{ serverId: 'server-1', tool: mockMcpTool({ name: 'tool' }) }],
        nextPageToken: 'more',
      }),
    );
    mockGetMcpServerToolsList.mockReturnValue(pageFetch);

    const renderResult = testHook(useMcpServerToolList)('server-1', 'odh-model-registries');
    await renderResult.waitForNextUpdate();

    expect(pageFetch).toHaveBeenCalledTimes(50);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(
        mockMcpToolList(),
        false,
        new Error('Catalog tools list is too large to load completely.'),
      ),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should surface a fetch error', async () => {
    const pageFetch = jest.fn().mockRejectedValue(new Error('tools request failed'));
    mockGetMcpServerToolsList.mockReturnValue(pageFetch);

    const renderResult = testHook(useMcpServerToolList)('server-1', 'odh-model-registries');
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(mockMcpToolList(), false, new Error('tools request failed')),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});

describe('useMcpServerConverter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not fetch when server id is missing', () => {
    const fetchConverter = jest.fn();
    mockGetMcpServerConverter.mockReturnValue(fetchConverter);

    const renderResult = testHook(useMcpServerConverter)('', 'odh-model-registries');

    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);
    expect(fetchConverter).not.toHaveBeenCalled();
  });

  it('should not fetch when catalog namespace is missing', () => {
    const fetchConverter = jest.fn();
    mockGetMcpServerConverter.mockReturnValue(fetchConverter);

    const renderResult = testHook(useMcpServerConverter)('server-1', '');

    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);
    expect(fetchConverter).not.toHaveBeenCalled();
  });

  it('should return converter data when the request succeeds', async () => {
    const crData = { spec: mockMcpDeploySpec() };
    const fetchConverter = jest.fn().mockResolvedValue(crData);
    mockGetMcpServerConverter.mockReturnValue(fetchConverter);

    const renderResult = testHook(useMcpServerConverter)('server-1', 'odh-model-registries');
    await renderResult.waitForNextUpdate();

    expect(mockGetMcpServerConverter).toHaveBeenCalledWith({ namespace: 'odh-model-registries' });
    expect(fetchConverter).toHaveBeenCalledWith(expect.any(Object), 'server-1');
    expect(renderResult).hookToStrictEqual(standardUseFetchState(crData, true));
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should surface a fetch error', async () => {
    const fetchConverter = jest.fn().mockRejectedValue(new Error('converter request failed'));
    mockGetMcpServerConverter.mockReturnValue(fetchConverter);

    const renderResult = testHook(useMcpServerConverter)('server-1', 'odh-model-registries');
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(null, false, new Error('converter request failed')),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
