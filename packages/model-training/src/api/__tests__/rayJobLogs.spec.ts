import { getRayJobDriverLogs } from '../rayJobLogs';

const mockFetch = jest.fn();
jest.spyOn(globalThis, 'fetch').mockImplementation(mockFetch);

describe('getRayJobDriverLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch logs from the correct endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('log line 1\nlog line 2'),
    });

    const result = await getRayJobDriverLogs('test-ns', 'head-pod', 'ray-head', 'job-123');

    expect(mockFetch).toHaveBeenCalledWith('/api/ray-job-logs/test-ns/head-pod/ray-head/job-123');
    expect(result).toBe('log line 1\nlog line 2');
  });

  it('should return empty string when logs are empty', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(''),
    });

    const result = await getRayJobDriverLogs('test-ns', 'head-pod', 'ray-head', 'job-123');

    expect(result).toBe('');
  });

  it('should throw error when response is not ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    });

    await expect(getRayJobDriverLogs('test-ns', 'head-pod', 'ray-head', 'job-123')).rejects.toThrow(
      'Failed to fetch logs: Internal Server Error',
    );
  });

  it('should throw error when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await expect(getRayJobDriverLogs('test-ns', 'head-pod', 'ray-head', 'job-123')).rejects.toThrow(
      'Network error',
    );
  });
});
