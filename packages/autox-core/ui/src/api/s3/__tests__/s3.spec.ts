/* eslint-disable camelcase -- BFF API uses snake_case for S3 object fields */
import { isModArchResponse, restCREATE, restGET } from 'mod-arch-core';
import { handleRestWithUIErrors } from '../../../components/primitive';
import { createS3Api } from '../s3';

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

const { uploadFileToS3, getFiles } = createS3Api('/test-product', 'v1');

describe('createS3Api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
