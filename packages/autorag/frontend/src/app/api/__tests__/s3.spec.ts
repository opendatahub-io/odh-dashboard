/* eslint-disable camelcase */
import { handleRestFailures, restCREATE, restGET } from 'mod-arch-core';
import { uploadFileToS3, getFiles, type GetFilesOptions } from '~/app/api/s3';
import type { S3ListObjectsResponse } from '~/app/types';

// Mock dependencies
jest.mock('mod-arch-core', () => ({
  handleRestFailures: jest.fn(),
  restCREATE: jest.fn(),
  restGET: jest.fn(),
  isModArchResponse: jest.fn((response) => response && 'data' in response),
  asEnumMember: jest.fn(),
  DeploymentMode: { Federated: 'Federated', Standalone: 'Standalone' },
}));

const mockHandleRestFailures = jest.mocked(handleRestFailures);
const mockRestCREATE = jest.mocked(restCREATE);
const mockRestGET = jest.mocked(restGET);

describe('s3 API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFileToS3', () => {
    const createMockFile = (name: string, content: string): File => {
      const blob = new Blob([content], { type: 'text/plain' });
      return new File([blob], name, { type: 'text/plain' });
    };

    it('should upload file successfully', async () => {
      const mockFile = createMockFile('test.txt', 'test content');
      const mockResponse = {
        uploaded: true,
        key: 'path/to/test.txt',
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const result = await uploadFileToS3(
        '',
        {
          namespace: 'test-namespace',
          secretName: 'test-secret',
          key: 'path/to/test.txt',
        },
        mockFile,
      );

      expect(mockRestCREATE).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/s3/file',
        expect.any(FormData),
        {
          namespace: 'test-namespace',
          secretName: 'test-secret',
          key: 'path/to/test.txt',
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should include bucket in query params when provided', async () => {
      const mockFile = createMockFile('test.txt', 'test content');
      const mockResponse = {
        uploaded: true,
        key: 'path/to/test.txt',
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      await uploadFileToS3(
        '',
        {
          namespace: 'test-namespace',
          secretName: 'test-secret',
          bucket: 'my-bucket',
          key: 'path/to/test.txt',
        },
        mockFile,
      );

      expect(mockRestCREATE).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/s3/file',
        expect.any(FormData),
        {
          namespace: 'test-namespace',
          secretName: 'test-secret',
          bucket: 'my-bucket',
          key: 'path/to/test.txt',
        },
      );
    });

    it('should not include bucket in query params when empty string', async () => {
      const mockFile = createMockFile('test.txt', 'test content');
      const mockResponse = {
        uploaded: true,
        key: 'path/to/test.txt',
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      await uploadFileToS3(
        '',
        {
          namespace: 'test-namespace',
          secretName: 'test-secret',
          bucket: '',
          key: 'path/to/test.txt',
        },
        mockFile,
      );

      expect(mockRestCREATE).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/s3/file',
        expect.any(FormData),
        {
          namespace: 'test-namespace',
          secretName: 'test-secret',
          key: 'path/to/test.txt',
        },
      );
    });

    it('should throw error when uploaded is false', async () => {
      const mockFile = createMockFile('test.txt', 'test content');
      const mockResponse = {
        uploaded: false,
        key: 'path/to/test.txt',
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      await expect(
        uploadFileToS3(
          '',
          {
            namespace: 'test-namespace',
            secretName: 'test-secret',
            key: 'path/to/test.txt',
          },
          mockFile,
        ),
      ).rejects.toThrow('Invalid upload response: expected uploaded: true and a non-empty key');
    });

    it('should throw error when key is empty', async () => {
      const mockFile = createMockFile('test.txt', 'test content');
      const mockResponse = {
        uploaded: true,
        key: '',
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      await expect(
        uploadFileToS3(
          '',
          {
            namespace: 'test-namespace',
            secretName: 'test-secret',
            key: 'path/to/test.txt',
          },
          mockFile,
        ),
      ).rejects.toThrow('Invalid upload response: expected uploaded: true and a non-empty key');
    });

    it('should throw error when key is whitespace only', async () => {
      const mockFile = createMockFile('test.txt', 'test content');
      const mockResponse = {
        uploaded: true,
        key: '   ',
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      await expect(
        uploadFileToS3(
          '',
          {
            namespace: 'test-namespace',
            secretName: 'test-secret',
            key: 'path/to/test.txt',
          },
          mockFile,
        ),
      ).rejects.toThrow('Invalid upload response: expected uploaded: true and a non-empty key');
    });

    it('should throw error for invalid response structure', async () => {
      const mockFile = createMockFile('test.txt', 'test content');
      mockHandleRestFailures.mockResolvedValue(null);

      await expect(
        uploadFileToS3(
          '',
          {
            namespace: 'test-namespace',
            secretName: 'test-secret',
            key: 'path/to/test.txt',
          },
          mockFile,
        ),
      ).rejects.toThrow('Invalid upload response');
    });

    it('should throw error when response is not an object', async () => {
      const mockFile = createMockFile('test.txt', 'test content');
      mockHandleRestFailures.mockResolvedValue('invalid response');

      await expect(
        uploadFileToS3(
          '',
          {
            namespace: 'test-namespace',
            secretName: 'test-secret',
            key: 'path/to/test.txt',
          },
          mockFile,
        ),
      ).rejects.toThrow('Invalid upload response');
    });
  });

  describe('getFiles', () => {
    const mockS3Response: S3ListObjectsResponse = {
      common_prefixes: [{ prefix: 'folder1/' }, { prefix: 'folder2/' }],
      contents: [
        {
          key: 'file1.txt',
          size: 1024,
          last_modified: '2025-01-01T00:00:00Z',
          etag: 'etag1',
          storage_class: 'STANDARD',
        },
        {
          key: 'file2.txt',
          size: 2048,
        },
      ],
      is_truncated: false,
      key_count: 2,
      max_keys: 1000,
    };

    it('should fetch files with namespace only', async () => {
      const mockResponse = {
        data: mockS3Response,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const result = await getFiles('', {}, { namespace: 'test-namespace' });

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/s3/files',
        { namespace: 'test-namespace' },
        {},
      );
      expect(result).toEqual(mockS3Response);
    });

    it('should include secretName when provided', async () => {
      const mockResponse = {
        data: mockS3Response,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      await getFiles('', {}, { namespace: 'test-namespace', secretName: 'my-secret' });

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/s3/files',
        {
          namespace: 'test-namespace',
          secretName: 'my-secret',
        },
        {},
      );
    });

    it('should include bucket when provided', async () => {
      const mockResponse = {
        data: mockS3Response,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      await getFiles('', {}, { namespace: 'test-namespace', bucket: 'my-bucket' });

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/s3/files',
        {
          namespace: 'test-namespace',
          bucket: 'my-bucket',
        },
        {},
      );
    });

    it('should include path when provided', async () => {
      const mockResponse = {
        data: mockS3Response,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      await getFiles('', {}, { namespace: 'test-namespace', path: 'documents/' });

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/s3/files',
        {
          namespace: 'test-namespace',
          path: 'documents/',
        },
        {},
      );
    });

    it('should include search when provided', async () => {
      const mockResponse = {
        data: mockS3Response,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      await getFiles('', {}, { namespace: 'test-namespace', search: 'pattern' });

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/s3/files',
        {
          namespace: 'test-namespace',
          search: 'pattern',
        },
        {},
      );
    });

    it('should include limit when provided', async () => {
      const mockResponse = {
        data: mockS3Response,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      await getFiles('', {}, { namespace: 'test-namespace', limit: 50 });

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/s3/files',
        {
          namespace: 'test-namespace',
          limit: '50',
        },
        {},
      );
    });

    it('should include limit when zero', async () => {
      const mockResponse = {
        data: mockS3Response,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      await getFiles('', {}, { namespace: 'test-namespace', limit: 0 });

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/s3/files',
        {
          namespace: 'test-namespace',
          limit: '0',
        },
        {},
      );
    });

    it('should include next when provided', async () => {
      const mockResponse = {
        data: mockS3Response,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      await getFiles('', {}, { namespace: 'test-namespace', next: 'token-123' });

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/s3/files',
        {
          namespace: 'test-namespace',
          next: 'token-123',
        },
        {},
      );
    });

    it('should include all optional parameters when provided', async () => {
      const mockResponse = {
        data: mockS3Response,
      };
      mockHandleRestFailures.mockResolvedValue(mockResponse);

      const options: GetFilesOptions = {
        namespace: 'test-namespace',
        secretName: 'my-secret',
        bucket: 'my-bucket',
        path: 'documents/',
        search: 'pattern',
        limit: 50,
        next: 'token-123',
      };

      await getFiles('', {}, options);

      expect(mockRestGET).toHaveBeenCalledWith(
        '',
        '/autorag/api/v1/s3/files',
        {
          namespace: 'test-namespace',
          secretName: 'my-secret',
          bucket: 'my-bucket',
          path: 'documents/',
          search: 'pattern',
          limit: '50',
          next: 'token-123',
        },
        {},
      );
    });

    it('should throw error for invalid response format', async () => {
      mockHandleRestFailures.mockResolvedValue(null);

      await expect(getFiles('', {}, { namespace: 'test-namespace' })).rejects.toThrow(
        'Invalid response format',
      );
    });

    it('should throw error for invalid S3ListObjectsResponse schema', async () => {
      const invalidResponse = {
        data: {
          common_prefixes: 'invalid', // Should be array
          contents: [],
          is_truncated: false,
          key_count: 0,
          max_keys: 1000,
        },
      };
      mockHandleRestFailures.mockResolvedValue(invalidResponse);

      await expect(getFiles('', {}, { namespace: 'test-namespace' })).rejects.toThrow(
        'Invalid S3ListObjectsResponse',
      );
    });

    it('should provide detailed Zod error messages', async () => {
      const invalidResponse = {
        data: {
          common_prefixes: [],
          contents: [{ key: 123 }], // key should be string
          is_truncated: false,
          key_count: 0,
          max_keys: 1000,
        },
      };
      mockHandleRestFailures.mockResolvedValue(invalidResponse);

      await expect(getFiles('', {}, { namespace: 'test-namespace' })).rejects.toThrow(
        /Invalid S3ListObjectsResponse/,
      );
    });
  });
});
