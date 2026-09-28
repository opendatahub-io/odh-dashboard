/* eslint-disable camelcase -- BFF API uses snake_case for S3 object fields */
import { isModArchResponse, restCREATE, restGET } from 'mod-arch-core';
import { handleRestWithUIErrors } from '../../../components/primitive';
import { combineAbortSignals, createS3Api } from '../s3';

jest.mock('mod-arch-core', () => ({
  isModArchResponse: jest.fn(),
  restCREATE: jest.fn(),
  restGET: jest.fn(),
}));

jest.mock('../../../components/primitive', () => ({
  handleRestWithUIErrors: jest.fn((promise: Promise<unknown>) => promise),
}));

const mockRestCREATE = jest.mocked(restCREATE);
const mockRestGET = jest.mocked(restGET);
const mockIsModArchResponse = jest.mocked(isModArchResponse);
const mockHandleRestWithUIErrors = jest.mocked(handleRestWithUIErrors);

const { uploadFileToS3, getFiles, fetchS3File } = createS3Api('/test-product', 'v1');

describe('createS3Api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('uploadFileToS3', () => {
    it('should throw for empty key', async () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      await expect(
        uploadFileToS3('', { namespace: 'ns', secretName: 'secret', key: '' }, file),
      ).rejects.toThrow('Upload key must be a non-empty string');
      expect(mockRestCREATE).not.toHaveBeenCalled();
      expect(mockHandleRestWithUIErrors).not.toHaveBeenCalled();
    });

    it('should throw for whitespace-only key', async () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      await expect(
        uploadFileToS3('', { namespace: 'ns', secretName: 'secret', key: '   ' }, file),
      ).rejects.toThrow('Upload key must be a non-empty string');
      expect(mockRestCREATE).not.toHaveBeenCalled();
      expect(mockHandleRestWithUIErrors).not.toHaveBeenCalled();
    });

    it('should call restCREATE with the correct URL and multipart form data', async () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      mockHandleRestWithUIErrors.mockResolvedValue({ uploaded: true, key: 'my/key.csv' });

      const result = await uploadFileToS3(
        '',
        { namespace: 'ns', secretName: 'secret', key: 'my/key.csv' },
        file,
      );

      expect(mockRestCREATE).toHaveBeenCalledWith(
        '',
        '/test-product/api/v1/s3/files/my%2Fkey.csv',
        expect.any(FormData),
        { namespace: 'ns', secretName: 'secret' },
      );
      expect(result).toEqual({ uploaded: true, key: 'my/key.csv' });
    });

    it('should include bucket in query params when provided', async () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      mockHandleRestWithUIErrors.mockResolvedValue({ uploaded: true, key: 'my-key' });

      await uploadFileToS3(
        '',
        { namespace: 'ns', secretName: 'secret', key: 'my-key', bucket: 'my-bucket' },
        file,
      );

      expect(mockRestCREATE).toHaveBeenCalledWith('', expect.any(String), expect.any(FormData), {
        namespace: 'ns',
        secretName: 'secret',
        bucket: 'my-bucket',
      });
    });

    it('should throw when the response payload is not a valid upload success shape', async () => {
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      mockHandleRestWithUIErrors.mockResolvedValue({ unexpected: 'shape' });

      await expect(
        uploadFileToS3('', { namespace: 'ns', secretName: 'secret', key: 'my-key' }, file),
      ).rejects.toThrow('Invalid upload response');
    });
  });

  describe('getFiles', () => {
    it('should call restGET with the correct URL and required namespace param', async () => {
      mockHandleRestWithUIErrors.mockImplementation((p) => p as never);
      mockRestGET.mockResolvedValue({
        data: {
          common_prefixes: [],
          contents: [],
          is_truncated: false,
          key_count: 0,
          max_keys: 100,
        },
      });
      mockIsModArchResponse.mockReturnValue(true);

      const opts = { signal: new AbortController().signal };
      await getFiles('', opts, { namespace: 'ns' });

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/test-product/api/v1/s3/files',
        { namespace: 'ns' },
        opts,
      );
    });

    it('should include optional query params when provided', async () => {
      mockHandleRestWithUIErrors.mockImplementation((p) => p as never);
      mockRestGET.mockResolvedValue({
        data: {
          common_prefixes: [],
          contents: [],
          is_truncated: false,
          key_count: 0,
          max_keys: 100,
        },
      });
      mockIsModArchResponse.mockReturnValue(true);

      await getFiles(
        '',
        {},
        {
          namespace: 'ns',
          secretName: 'secret',
          bucket: 'bucket',
          path: 'path/',
          search: 'query',
          limit: 10,
          next: 'token',
        },
      );

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/test-product/api/v1/s3/files',
        {
          namespace: 'ns',
          secretName: 'secret',
          bucket: 'bucket',
          path: 'path/',
          search: 'query',
          limit: '10',
          next: 'token',
        },
        {},
      );
    });

    it('should parse and return a valid response', async () => {
      const validResponse = {
        common_prefixes: [{ prefix: 'folder/' }],
        contents: [{ key: 'file.csv', size: 123 }],
        is_truncated: false,
        key_count: 1,
        max_keys: 100,
      };
      mockHandleRestWithUIErrors.mockImplementation((p) => p as never);
      mockRestGET.mockResolvedValue({ data: validResponse });
      mockIsModArchResponse.mockReturnValue(true);

      const result = await getFiles('', {}, { namespace: 'ns' });

      expect(result).toEqual(validResponse);
    });

    it('should throw a descriptive error when the response fails schema validation', async () => {
      mockHandleRestWithUIErrors.mockImplementation((p) => p as never);
      mockRestGET.mockResolvedValue({ data: { invalid: 'shape' } });
      mockIsModArchResponse.mockReturnValue(true);

      await expect(getFiles('', {}, { namespace: 'ns' })).rejects.toThrow(
        'Invalid S3ListObjectsResponse',
      );
    });

    it('should throw when response is not a valid ModArch response', async () => {
      mockHandleRestWithUIErrors.mockImplementation((p) => p as never);
      mockRestGET.mockResolvedValue({ unexpected: 'shape' });
      mockIsModArchResponse.mockReturnValue(false);

      await expect(getFiles('', {}, { namespace: 'ns' })).rejects.toThrow(
        'Invalid response format',
      );
    });

    it('should route errors through handleRestWithUIErrors', async () => {
      mockHandleRestWithUIErrors.mockRejectedValue(new Error('boom'));

      await expect(getFiles('', {}, { namespace: 'ns' })).rejects.toThrow('boom');
      expect(mockHandleRestWithUIErrors).toHaveBeenCalled();
    });
  });

  describe('fetchS3File', () => {
    it('should pass an already-aborted caller signal to the fetch request', async () => {
      const callerController = new AbortController();
      callerController.abort();
      const fetchMock = jest.mocked(global.fetch);
      fetchMock.mockImplementation((_input, init) => {
        expect(init?.signal?.aborted).toBe(true);
        return Promise.resolve({
          ok: true,
          headers: new Headers(),
          blob: async () => new Blob(['content']),
        } as Response);
      });

      await fetchS3File('ns', 'file.json', { signal: callerController.signal });

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should abort the composed request when maxBytes is exceeded', async () => {
      const callerController = new AbortController();
      let requestSignal: AbortSignal | undefined;
      const fetchMock = jest.mocked(global.fetch);
      fetchMock.mockImplementation((_input, init) => {
        requestSignal = init?.signal ?? undefined;
        return Promise.resolve({
          ok: true,
          headers: new Headers({ 'Content-Length': '5' }),
          blob: async () => new Blob(['12345']),
        } as Response);
      });

      await expect(
        fetchS3File('ns', 'file.json', { signal: callerController.signal, maxBytes: 4 }),
      ).rejects.toThrow('S3 file too large: 5 bytes exceeds limit of 4 bytes');

      expect(requestSignal?.aborted).toBe(true);
      expect(callerController.signal.aborted).toBe(false);
    });
  });

  describe('combineAbortSignals', () => {
    it('should remove listeners after the composed request completes', () => {
      const callerController = new AbortController();
      const queryController = new AbortController();
      const callerRemoveSpy = jest.spyOn(callerController.signal, 'removeEventListener');
      const queryRemoveSpy = jest.spyOn(queryController.signal, 'removeEventListener');

      const combined = combineAbortSignals(callerController.signal, queryController.signal);
      combined.cleanup();

      expect(callerRemoveSpy).toHaveBeenCalledWith('abort', expect.any(Function));
      expect(queryRemoveSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    });

    it('should remove listeners after a composed request aborts', () => {
      const callerController = new AbortController();
      const queryController = new AbortController();
      const callerRemoveSpy = jest.spyOn(callerController.signal, 'removeEventListener');
      const queryRemoveSpy = jest.spyOn(queryController.signal, 'removeEventListener');

      const combined = combineAbortSignals(callerController.signal, queryController.signal);
      callerController.abort();
      combined.cleanup();

      expect(combined.signal?.aborted).toBe(true);
      expect(callerRemoveSpy).toHaveBeenCalledWith('abort', expect.any(Function));
      expect(queryRemoveSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    });
  });
});
