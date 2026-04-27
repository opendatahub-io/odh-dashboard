import { fetchS3File } from '~/app/hooks/queries';

global.fetch = jest.fn();

describe('fetchS3File', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw for empty key', async () => {
    await expect(fetchS3File('ns', '')).rejects.toThrow('File key must be a non-empty string');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should throw for whitespace-only key', async () => {
    await expect(fetchS3File('ns', '   ')).rejects.toThrow('File key must be a non-empty string');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should construct URL with namespace and key', async () => {
    const mockBlob = new Blob(['file content']);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    });

    const result = await fetchS3File('test-namespace', 'path/to/file.json');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/s3/files/path%2Fto%2Ffile.json?'),
      expect.objectContaining({ signal: undefined }),
    );
    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('namespace=test-namespace');
    expect(result).toBe(mockBlob);
  });

  it('should include secretName and bucket when provided', async () => {
    const mockBlob = new Blob(['content']);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    });

    await fetchS3File('ns', 'key.csv', { secretName: 'my-secret', bucket: 'my-bucket' });

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('secretName=my-secret');
    expect(callUrl).toContain('bucket=my-bucket');
  });

  it('should encode special characters in key', async () => {
    const mockBlob = new Blob(['content']);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    });

    await fetchS3File('test-namespace', 'folder/my file.csv');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/s3/files/folder%2Fmy%20file.csv?'),
      expect.objectContaining({ signal: undefined }),
    );
    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('namespace=test-namespace');
  });

  it('should omit secretName and bucket when not provided', async () => {
    const mockBlob = new Blob(['content']);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    });

    await fetchS3File('ns', 'key.csv');

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).not.toContain('secretName=');
    expect(callUrl).not.toContain('bucket=');
  });

  it('should throw with statusText on non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
      json: async () => {
        throw new Error('no body');
      },
    });

    await expect(fetchS3File('ns', 'missing.json')).rejects.toThrow(
      'Failed to fetch file: Not Found',
    );
  });

  it('should throw with API error message when available', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      json: async () => ({
        error: { message: 'S3 key not found' },
      }),
    });

    await expect(fetchS3File('ns', 'bad-key')).rejects.toThrow(
      'Failed to fetch file: S3 key not found',
    );
  });

  it('should fall back to statusText when error JSON is malformed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => ({ unexpected: 'shape' }),
    });

    await expect(fetchS3File('ns', 'key')).rejects.toThrow(
      'Failed to fetch file: Internal Server Error',
    );
  });
});
