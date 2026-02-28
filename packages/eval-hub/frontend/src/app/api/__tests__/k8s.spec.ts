import { handleRestFailures, restGET, isModArchResponse } from 'mod-arch-core';
import { getCollections, getProviders } from '~/app/api/k8s';
import type { Collection, Provider } from '~/app/types';

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/eval-hub',
  BFF_API_VERSION: 'v1',
}));

jest.mock('mod-arch-core', () => ({
  handleRestFailures: jest.fn((promise: Promise<unknown>) => promise),
  restGET: jest.fn(),
  isModArchResponse: jest.fn(),
}));

const mockRestGET = jest.mocked(restGET);
const mockIsModArchResponse = jest.mocked(isModArchResponse);
// handleRestFailures is mocked to pass through the promise — no need to assert on it directly

describe('getCollections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (handleRestFailures as jest.Mock).mockImplementation((promise: Promise<unknown>) => promise);
  });

  it('should return the array directly when response data is already an array', async () => {
    const collections: Collection[] = [{ resource: { id: 'col-1' }, name: 'Alpha' }];
    mockRestGET.mockResolvedValue({ data: collections });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getCollections('', 'test-ns')({});

    expect(result).toEqual(collections);
  });

  it('should return items from the envelope when response data has an items property', async () => {
    const collections: Collection[] = [{ resource: { id: 'col-2' }, name: 'Beta' }];
    mockRestGET.mockResolvedValue({ data: { items: collections } });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getCollections('', 'test-ns')({});

    expect(result).toEqual(collections);
  });

  it('should throw when response is not a valid mod-arch response', async () => {
    mockRestGET.mockResolvedValue({ invalid: 'format' });
    mockIsModArchResponse.mockReturnValue(false);

    await expect(getCollections('', 'test-ns')({})).rejects.toThrow('Invalid response format');
  });

  it('should call restGET with the correct URL and namespace query param', async () => {
    mockRestGET.mockResolvedValue({ data: [] });
    mockIsModArchResponse.mockReturnValue(true);

    const opts = {};
    await getCollections('', 'my-ns')(opts);

    expect(mockRestGET).toHaveBeenCalledWith(
      '',
      '/eval-hub/api/v1/evaluations/collections',
      { namespace: 'my-ns' },
      opts,
    );
  });

  it('should pass the hostPath to restGET', async () => {
    mockRestGET.mockResolvedValue({ data: [] });
    mockIsModArchResponse.mockReturnValue(true);

    await getCollections('http://my-host', 'ns')({});

    expect(mockRestGET).toHaveBeenCalledWith(
      'http://my-host',
      expect.any(String),
      expect.any(Object),
      expect.any(Object),
    );
  });
});

describe('getProviders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (handleRestFailures as jest.Mock).mockImplementation((promise: Promise<unknown>) => promise);
  });

  it('should return the array directly when response data is already an array', async () => {
    const providers: Provider[] = [{ resource: { id: 'prov-1' }, name: 'Provider A' }];
    mockRestGET.mockResolvedValue({ data: providers });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getProviders('', 'test-ns')({});

    expect(result).toEqual(providers);
  });

  it('should return items from the envelope when response data has an items property', async () => {
    const providers: Provider[] = [{ resource: { id: 'prov-2' }, name: 'Provider B' }];
    mockRestGET.mockResolvedValue({ data: { items: providers } });
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getProviders('', 'test-ns')({});

    expect(result).toEqual(providers);
  });

  it('should throw when response is not a valid mod-arch response', async () => {
    mockRestGET.mockResolvedValue({ invalid: 'format' });
    mockIsModArchResponse.mockReturnValue(false);

    await expect(getProviders('', 'test-ns')({})).rejects.toThrow('Invalid response format');
  });

  it('should call restGET with the correct URL and namespace query param', async () => {
    mockRestGET.mockResolvedValue({ data: [] });
    mockIsModArchResponse.mockReturnValue(true);

    const opts = {};
    await getProviders('', 'my-ns')(opts);

    expect(mockRestGET).toHaveBeenCalledWith(
      '',
      '/eval-hub/api/v1/evaluations/providers',
      { namespace: 'my-ns' },
      opts,
    );
  });

  it('should pass the hostPath to restGET', async () => {
    mockRestGET.mockResolvedValue({ data: [] });
    mockIsModArchResponse.mockReturnValue(true);

    await getProviders('http://my-host', 'ns')({});

    expect(mockRestGET).toHaveBeenCalledWith(
      'http://my-host',
      expect.any(String),
      expect.any(Object),
      expect.any(Object),
    );
  });
});
