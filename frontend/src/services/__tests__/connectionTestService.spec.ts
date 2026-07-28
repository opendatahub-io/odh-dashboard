import axios from '#~/utilities/axios';
import { testConnection } from '#~/services/connectionTestService';
import { ConnectionTestRequest, ConnectionTestResult } from '#~/concepts/connectionTypes/types';

jest.mock('#~/utilities/axios', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

const mockedAxios = jest.mocked(axios);

describe('testConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRequest: ConnectionTestRequest = {
    connectionType: 's3',
    fieldValues: { endpoint: 'http://minio:9000', bucket: 'test-bucket' },
  };

  const mockSuccessResult: ConnectionTestResult = {
    success: true,
    message: 'Connection successful',
  };

  const mockFailedResult: ConnectionTestResult = {
    success: false,
    message: 'Invalid credentials',
  };

  it('should send POST request with correct payload', async () => {
    mockedAxios.post.mockResolvedValue({ data: { data: mockSuccessResult } });

    await testConnection(mockRequest);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      '/core-bff/api/v1/connections/test',
      mockRequest,
      { signal: undefined, timeout: 15_000 },
    );
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('should unwrap the data envelope from the response', async () => {
    mockedAxios.post.mockResolvedValue({ data: { data: mockSuccessResult } });

    const result = await testConnection(mockRequest);

    expect(result).toStrictEqual(mockSuccessResult);
  });

  it('should handle successful connection test', async () => {
    mockedAxios.post.mockResolvedValue({ data: { data: mockSuccessResult } });

    const result = await testConnection(mockRequest);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Connection successful');
  });

  it('should handle failed connection test', async () => {
    mockedAxios.post.mockResolvedValue({ data: { data: mockFailedResult } });

    const result = await testConnection(mockRequest);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Invalid credentials');
  });

  it('should throw on network error with descriptive message', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Network Error'));

    await expect(testConnection(mockRequest)).rejects.toThrow('Network Error');
  });

  it('should pass AbortSignal to axios', async () => {
    const controller = new AbortController();
    mockedAxios.post.mockResolvedValue({ data: { data: mockSuccessResult } });

    await testConnection(mockRequest, controller.signal);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      '/core-bff/api/v1/connections/test',
      mockRequest,
      { signal: controller.signal, timeout: 15_000 },
    );
  });

  it('should handle 400 UNSUPPORTED_TYPE error', async () => {
    mockedAxios.post.mockRejectedValue({
      response: {
        data: {
          error: {
            message: 'Connection type "custom-type" is not supported for testing',
          },
        },
      },
      message: 'Request failed with status code 400',
    });

    await expect(testConnection(mockRequest)).rejects.toThrow(
      'Connection type "custom-type" is not supported for testing',
    );
  });

  it('should handle 503 PROBE_BUSY error', async () => {
    mockedAxios.post.mockRejectedValue({
      response: {
        data: {
          error: {
            message: 'A connection test is already in progress',
          },
        },
      },
      message: 'Request failed with status code 503',
    });

    await expect(testConnection(mockRequest)).rejects.toThrow(
      'A connection test is already in progress',
    );
  });

  it('should handle 500 server error with structured error response', async () => {
    mockedAxios.post.mockRejectedValue({
      response: {
        data: {
          error: {
            message: 'Internal server error: probe crashed',
          },
        },
      },
      message: 'Request failed with status code 500',
    });

    await expect(testConnection(mockRequest)).rejects.toThrow(
      'Internal server error: probe crashed',
    );
  });

  it('should fall back to generic message when structured error is missing', async () => {
    mockedAxios.post.mockRejectedValue({
      response: { data: {} },
      message: 'Request failed with status code 500',
    });

    await expect(testConnection(mockRequest)).rejects.toThrow(
      'Request failed with status code 500',
    );
  });

  it('should reject with AbortError when request is aborted', async () => {
    const controller = new AbortController();
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    mockedAxios.post.mockRejectedValue(abortError);

    controller.abort();

    await expect(testConnection(mockRequest, controller.signal)).rejects.toThrow(
      'The operation was aborted.',
    );
  });
});
