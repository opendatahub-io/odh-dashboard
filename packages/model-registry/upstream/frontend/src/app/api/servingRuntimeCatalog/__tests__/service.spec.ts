import { handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import {
  getServingRuntime,
  getServingRuntimeFilterOptionList,
  getServingRuntimeList,
  getServingRuntimeVersions,
} from '~/app/api/servingRuntimeCatalog/service';

jest.mock('mod-arch-core', () => ({
  restGET: jest.fn(),
  handleRestFailures: jest.fn(),
  isModArchResponse: jest.fn(),
}));

const host = '/api/v1/serving_runtime_catalog';
const namespace = { namespace: 'catalog-ns' };
const restGETMock = jest.mocked(restGET);
const handleRestFailuresMock = jest.mocked(handleRestFailures);
const isModArchResponseMock = jest.mocked(isModArchResponse);

beforeEach(() => {
  jest.clearAllMocks();
  isModArchResponseMock.mockReturnValue(true);
  handleRestFailuresMock.mockResolvedValue({ data: {} });
});

describe('serving runtime catalog services', () => {
  it('should preserve namespace and request options while serializing list parameters', async () => {
    const opts = { signal: new AbortController().signal };
    const list = {
      items: [{ id: '1', name: 'vllm' }],
      size: 1,
      pageSize: 5,
      nextPageToken: 'next',
    };
    handleRestFailuresMock.mockResolvedValue({ data: list });
    await expect(
      getServingRuntimeList(host, namespace)(opts, {
        source: ['redhat-runtimes', 'community-runtimes'],
        sourceLabel: ['Red Hat'],
        pageSize: 5,
        nextPageToken: 'cursor',
        q: 'vllm',
        name: 'v%',
        filterQuery: "provider='Red Hat'",
        orderBy: 'NAME',
        sortOrder: 'DESC',
      }),
    ).resolves.toEqual(list);
    expect(restGETMock).toHaveBeenCalledWith(
      host,
      '/serving_runtimes',
      {
        ...namespace,
        source: 'redhat-runtimes,community-runtimes',
        sourceLabel: 'Red Hat',
        pageSize: '5',
        nextPageToken: 'cursor',
        q: 'vllm',
        name: 'v%',
        filterQuery: "provider='Red Hat'",
        orderBy: 'NAME',
        sortOrder: 'DESC',
      },
      opts,
    );
  });

  it('should omit unset and empty query parameters', async () => {
    await getServingRuntimeList(host, namespace)({}, { q: '', filterQuery: undefined });
    expect(restGETMock).toHaveBeenCalledWith(host, '/serving_runtimes', namespace, {});
  });

  it('should encode runtime IDs and unwrap runtime responses', async () => {
    const runtime = { id: 'id/with space', sourceId: 'redhat-runtimes' };
    handleRestFailuresMock.mockResolvedValue({ data: runtime });
    await expect(getServingRuntime(host, namespace)({}, runtime.id)).resolves.toEqual(runtime);
    expect(restGETMock).toHaveBeenCalledWith(
      host,
      '/serving_runtimes/id%2Fwith%20space',
      namespace,
      {},
    );
  });

  it('should fetch paginated versions for the selected runtime', async () => {
    const list = {
      items: [{ artifactType: 'serving-runtime-version', version: '1', image: 'example/image:1' }],
      size: 1,
      pageSize: 1,
      nextPageToken: '',
    };
    handleRestFailuresMock.mockResolvedValue({ data: list });
    await expect(
      getServingRuntimeVersions(host, namespace)({}, '1', { pageSize: 1, nextPageToken: 'cursor' }),
    ).resolves.toEqual(list);
    expect(restGETMock).toHaveBeenCalledWith(
      host,
      '/serving_runtimes/1/versions',
      { ...namespace, pageSize: '1', nextPageToken: 'cursor' },
      {},
    );
  });

  it('should fetch runtime filter options', async () => {
    const filters = { filters: { provider: { type: 'string', values: ['Red Hat'] } } };
    handleRestFailuresMock.mockResolvedValue({ data: filters });
    await expect(getServingRuntimeFilterOptionList(host, namespace)({})).resolves.toEqual(filters);
    expect(restGETMock).toHaveBeenCalledWith(
      host,
      '/serving_runtimes_filter_options',
      namespace,
      {},
    );
  });

  it('should reject invalid response envelopes', async () => {
    isModArchResponseMock.mockReturnValue(false);
    await expect(getServingRuntimeList(host, namespace)({})).rejects.toThrow(
      'Invalid response format',
    );
  });

  it('should propagate backend failures', async () => {
    handleRestFailuresMock.mockRejectedValue(
      new Error('serving runtime catalog is only available in catalog mock mode'),
    );
    await expect(getServingRuntime(host, namespace)({}, '1')).rejects.toThrow(
      'only available in catalog mock mode',
    );
  });
});
