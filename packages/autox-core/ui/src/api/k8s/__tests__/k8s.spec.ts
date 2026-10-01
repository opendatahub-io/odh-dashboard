import { handleRestFailures, restGET, isModArchResponse } from 'mod-arch-core';
import { createK8sApi } from '../k8s';

jest.mock('mod-arch-core', () => ({
  handleRestFailures: jest.fn((promise: Promise<unknown>) => promise),
  restGET: jest.fn(),
  isModArchResponse: jest.fn(),
}));

const mockRestGET = jest.mocked(restGET);
const mockHandleRestFailures = jest.mocked(handleRestFailures);
const mockIsModArchResponse = jest.mocked(isModArchResponse);

const { getUser, getNamespaces, getSecrets } = createK8sApi('/test-product', 'v1');

describe('createK8sApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleRestFailures.mockImplementation((promise) => promise);
  });

  describe('getUser', () => {
    it('should call restGET with the correct URL', async () => {
      mockRestGET.mockResolvedValue({ data: { userId: 'user@example.com' } });
      mockIsModArchResponse.mockReturnValue(true);

      const opts = { signal: new AbortController().signal };
      await getUser('')(opts);

      expect(mockRestGET).toHaveBeenCalledWith('', '/test-product/api/v1/user', {}, opts);
    });

    it('should return data from ModArch response envelope', async () => {
      const mockData = { userId: 'user@example.com' };
      mockRestGET.mockResolvedValue({ data: mockData });
      mockIsModArchResponse.mockReturnValue(true);

      const result = await getUser('')({ signal: undefined });

      expect(result).toEqual(mockData);
    });

    it('should throw when response is not a valid ModArch response', async () => {
      mockRestGET.mockResolvedValue({ unexpected: 'shape' });
      mockIsModArchResponse.mockReturnValue(false);

      await expect(getUser('')({ signal: undefined })).rejects.toThrow('Invalid response format');
    });

    it('should propagate errors thrown by handleRestFailures', async () => {
      mockHandleRestFailures.mockRejectedValue(new Error('Network error'));

      await expect(getUser('')({ signal: undefined })).rejects.toThrow('Network error');
    });
  });

  describe('getNamespaces', () => {
    it('should call restGET with the correct URL', async () => {
      mockRestGET.mockResolvedValue({ data: [] });
      mockIsModArchResponse.mockReturnValue(true);

      const opts = { signal: new AbortController().signal };
      await getNamespaces('')(opts);

      expect(mockRestGET).toHaveBeenCalledWith('', '/test-product/api/v1/namespaces', {}, opts);
    });

    it('should return data from ModArch response envelope', async () => {
      const mockData = [{ name: 'ns-1' }, { name: 'ns-2', displayName: 'Namespace 2' }];
      mockRestGET.mockResolvedValue({ data: mockData });
      mockIsModArchResponse.mockReturnValue(true);

      const result = await getNamespaces('')({ signal: undefined });

      expect(result).toEqual(mockData);
    });

    it('should throw when response is not a valid ModArch response', async () => {
      mockRestGET.mockResolvedValue({ unexpected: 'shape' });
      mockIsModArchResponse.mockReturnValue(false);

      await expect(getNamespaces('')({ signal: undefined })).rejects.toThrow(
        'Invalid response format',
      );
    });
  });

  describe('getSecrets', () => {
    it('should call restGET with namespace only when type is omitted', async () => {
      mockRestGET.mockResolvedValue({ data: [] });
      mockIsModArchResponse.mockReturnValue(true);

      const opts = { signal: new AbortController().signal };
      await getSecrets('')('test-ns')(opts);

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/test-product/api/v1/secrets',
        { namespace: 'test-ns' },
        opts,
      );
    });

    it('should include type in query params when provided', async () => {
      mockRestGET.mockResolvedValue({ data: [] });
      mockIsModArchResponse.mockReturnValue(true);

      const opts = { signal: new AbortController().signal };
      await getSecrets('')('test-ns', 'storage')(opts);

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/test-product/api/v1/secrets',
        { namespace: 'test-ns', type: 'storage' },
        opts,
      );
    });

    it('should accept any product-defined secret type string', async () => {
      mockRestGET.mockResolvedValue({ data: [] });
      mockIsModArchResponse.mockReturnValue(true);

      const opts = { signal: new AbortController().signal };
      await getSecrets('')('test-ns', 'ogx')(opts);

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/test-product/api/v1/secrets',
        { namespace: 'test-ns', type: 'ogx' },
        opts,
      );
    });

    it('should return data from ModArch response envelope', async () => {
      const mockData = [{ uuid: '1', name: 'secret-1' }];
      mockRestGET.mockResolvedValue({ data: mockData });
      mockIsModArchResponse.mockReturnValue(true);

      const result = await getSecrets('')('test-ns')({ signal: undefined });

      expect(result).toEqual(mockData);
    });

    it('should throw when response is not a valid ModArch response', async () => {
      mockRestGET.mockResolvedValue({ unexpected: 'shape' });
      mockIsModArchResponse.mockReturnValue(false);

      await expect(getSecrets('')('test-ns')({ signal: undefined })).rejects.toThrow(
        'Invalid response format',
      );
    });
  });

  it('should scope generated URLs to the urlPrefix/bffApiVersion passed to createK8sApi', async () => {
    const { getUser: getOtherUser } = createK8sApi('/other-product', 'v2');
    mockRestGET.mockResolvedValue({ data: {} });
    mockIsModArchResponse.mockReturnValue(true);

    await getOtherUser('')({ signal: undefined });

    expect(mockRestGET).toHaveBeenCalledWith(
      '',
      '/other-product/api/v2/user',
      {},
      {
        signal: undefined,
      },
    );
  });
});
