import { handleRestFailures, restGET, isModArchResponse } from 'mod-arch-core';
import { getSecretByName } from '~/app/api/k8s';

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/autorag',
  BFF_API_VERSION: 'v1',
}));

jest.mock('mod-arch-core', () => ({
  handleRestFailures: jest.fn(),
  restGET: jest.fn(),
  isModArchResponse: jest.fn(),
}));

const mockRestGET = jest.mocked(restGET);
const mockHandleRestFailures = jest.mocked(handleRestFailures);
const mockIsModArchResponse = jest.mocked(isModArchResponse);

describe('getSecretByName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call restGET with correct URL and namespace query param', async () => {
    const mockData = { OGX_CLIENT_API_KEY: 'key', OGX_CLIENT_BASE_URL: 'url' };
    const mockResponse = { data: mockData };
    mockRestGET.mockReturnValue(Promise.resolve(mockResponse) as never);
    mockHandleRestFailures.mockImplementation((p) => p as never);
    mockIsModArchResponse.mockReturnValue(true);

    const opts = { signal: new AbortController().signal };
    await getSecretByName('')('test-ns', 'my-secret')(opts);

    expect(mockRestGET).toHaveBeenCalledWith(
      '',
      '/autorag/api/v1/secret/my-secret',
      { namespace: 'test-ns' },
      opts,
    );
  });

  it('should encode special characters in secret name', async () => {
    const mockResponse = { data: {} };
    mockRestGET.mockReturnValue(Promise.resolve(mockResponse) as never);
    mockHandleRestFailures.mockImplementation((p) => p as never);
    mockIsModArchResponse.mockReturnValue(true);

    const opts = { signal: new AbortController().signal };
    await getSecretByName('')('ns', 'my/special.secret')(opts);

    expect(mockRestGET).toHaveBeenCalledWith(
      '',
      '/autorag/api/v1/secret/my%2Fspecial.secret',
      { namespace: 'ns' },
      opts,
    );
  });

  it('should return data from ModArch response envelope', async () => {
    const mockData = { KEY: 'value' };
    const mockResponse = { data: mockData };
    mockRestGET.mockReturnValue(Promise.resolve(mockResponse) as never);
    mockHandleRestFailures.mockImplementation((p) => p as never);
    mockIsModArchResponse.mockReturnValue(true);

    const result = await getSecretByName('')('ns', 'secret')({ signal: undefined });

    expect(result).toEqual(mockData);
  });

  it('should throw when response is not a valid ModArch response', async () => {
    const mockResponse = { unexpected: 'shape' };
    mockRestGET.mockReturnValue(Promise.resolve(mockResponse) as never);
    mockHandleRestFailures.mockImplementation((p) => p as never);
    mockIsModArchResponse.mockReturnValue(false);

    await expect(getSecretByName('')('ns', 'secret')({ signal: undefined })).rejects.toThrow(
      'Invalid response format',
    );
  });
});
