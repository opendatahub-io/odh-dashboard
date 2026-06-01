/* eslint-disable camelcase */
import { getFiles } from '#~/concepts/fileExplorer/api/s3.ts';
import type { S3ListObjectsResponse } from '#~/concepts/fileExplorer/types.ts';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const validResponse: S3ListObjectsResponse = {
  common_prefixes: [{ prefix: 'folder/' }],
  contents: [{ key: 'file.txt', size: 100 }],
  is_truncated: false,
  key_count: 1,
  max_keys: 1000,
};

describe('getFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch files and return parsed response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: validResponse }),
    });

    const result = await getFiles(
      '',
      {},
      { apiPath: '/autorag/api/v1/s3', namespace: 'ns', secretName: 'secret' },
    );

    expect(result).toEqual(validResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [urlArg, init] = mockFetch.mock.calls[0];
    const url = urlArg.href;
    expect(url).toContain('/autorag/api/v1/s3/files');
    expect(url).toContain('namespace=ns');
    expect(url).toContain('secretName=secret');
    expect(init.method).toBe('GET');
  });

  it('should handle responses not wrapped in { data }', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(validResponse),
    });

    const result = await getFiles('', {}, { apiPath: '/autorag/api/v1/s3', namespace: 'ns' });

    expect(result).toEqual(validResponse);
  });

  it('should pass optional query params when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: validResponse }),
    });

    await getFiles(
      '',
      {},
      {
        apiPath: '/autorag/api/v1/s3',
        namespace: 'ns',
        secretName: 'secret',
        bucket: 'my-bucket',
        path: 'docs/',
        search: 'readme',
        limit: 25,
        next: 'token123',
      },
    );

    const [urlArg] = mockFetch.mock.calls[0];
    const url = urlArg.href;
    expect(url).toContain('bucket=my-bucket');
    expect(url).toContain('path=docs%2F');
    expect(url).toContain('search=readme');
    expect(url).toContain('limit=25');
    expect(url).toContain('next=token123');
  });

  it('should forward the abort signal', async () => {
    const controller = new AbortController();

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: validResponse }),
    });

    await getFiles(
      '',
      { signal: controller.signal },
      { apiPath: '/autorag/api/v1/s3', namespace: 'ns' },
    );

    const [, init] = mockFetch.mock.calls[0];
    expect(init.signal).toBe(controller.signal);
  });

  it('should throw on non-2xx response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: () => Promise.resolve('something broke'),
    });

    await expect(
      getFiles('', {}, { apiPath: '/autorag/api/v1/s3', namespace: 'ns' }),
    ).rejects.toThrow('Request failed (500)');
  });

  it('should throw on invalid response shape', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { not: 'valid' } }),
    });

    await expect(
      getFiles('', {}, { apiPath: '/autorag/api/v1/s3', namespace: 'ns' }),
    ).rejects.toThrow('Invalid S3ListObjectsResponse');
  });
});
