/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError, AxiosResponse, RawAxiosResponseHeaders } from 'axios';
import { logApiCall, logApiResponse, logApiError, ApiResponse, ApiError } from '../helpers/logging';

export interface ApiTestConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
}

export interface ApiTestResult {
  success: boolean;
  response?: ApiResponse;
  error?: ApiError;
}

/**
 * Generic API client for contract testing
 */
export class ContractApiClient {
  private config: ApiTestConfig;

  private static normalizeHeaders(
    headers: RawAxiosResponseHeaders | Record<string, unknown> | undefined,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    if (!headers || typeof headers !== 'object') {
      return result;
    }
    Object.entries(headers).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        result[key] = value.join(', ');
      } else if (value != null) {
        result[key] = String(value);
      }
    });
    return result;
  }

  constructor(config: ApiTestConfig) {
    this.config = {
      timeout: 10000,
      ...config,
    };
  }

  /**
   * Make a GET request and log the results
   */
  async get(
    path: string,
    testName: string,
    options: {
      headers?: Record<string, string>;
      params?: Record<string, string>;
    } = {},
  ): Promise<ApiTestResult> {
    const url = `${this.config.baseUrl}${path}`;
    const headers = { ...this.config.defaultHeaders, ...options.headers };
    const controller = new AbortController();
    const httpAgent = new (await import('http')).Agent({ keepAlive: false });
    const httpsAgent = new (await import('https')).Agent({ keepAlive: false });

    try {
      logApiCall('GET', url, headers);

      const response: AxiosResponse = await axios.get(url, {
        headers,
        params: options.params,
        timeout: this.config.timeout,
        signal: controller.signal,
        httpAgent,
        httpsAgent,
      });

      const apiResponse: ApiResponse = {
        status: response.status,
        headers: ContractApiClient.normalizeHeaders(response.headers),
        data: response.data,
      };

      logApiResponse(testName, apiResponse);

      return {
        success: true,
        response: apiResponse,
      };
    } catch (error) {
      const apiError = this.handleAxiosError(error, testName);
      return {
        success: false,
        error: apiError,
      };
    } finally {
      controller.abort();
    }
  }

  /**
   * Make a POST request and log the results
   */
  async post(
    path: string,
    testName: string,
    data: unknown,
    options: {
      headers?: Record<string, string>;
    } = {},
  ): Promise<ApiTestResult> {
    const url = `${this.config.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.config.defaultHeaders,
      ...options.headers,
    };
    const controller = new AbortController();

    try {
      logApiCall('POST', url, headers);

      const response: AxiosResponse = await axios.post(url, data, {
        headers,
        timeout: this.config.timeout,
        signal: controller.signal,
      });

      const apiResponse: ApiResponse = {
        status: response.status,
        headers: ContractApiClient.normalizeHeaders(response.headers),
        data: response.data,
      };

      logApiResponse(testName, apiResponse);

      return {
        success: true,
        response: apiResponse,
      };
    } catch (error) {
      const apiError = this.handleAxiosError(error, testName);
      return {
        success: false,
        error: apiError,
      };
    } finally {
      controller.abort();
    }
  }

  /**
   * Make a PUT request and log the results
   */
  async put(
    path: string,
    testName: string,
    data: unknown,
    options: {
      headers?: Record<string, string>;
    } = {},
  ): Promise<ApiTestResult> {
    const url = `${this.config.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.config.defaultHeaders,
      ...options.headers,
    };
    const controller = new AbortController();

    try {
      logApiCall('PUT', url, headers);

      const response: AxiosResponse = await axios.put(url, data, {
        headers,
        timeout: this.config.timeout,
        signal: controller.signal,
      });

      const apiResponse: ApiResponse = {
        status: response.status,
        headers: ContractApiClient.normalizeHeaders(response.headers),
        data: response.data,
      };

      logApiResponse(testName, apiResponse);

      return {
        success: true,
        response: apiResponse,
      };
    } catch (error) {
      const apiError = this.handleAxiosError(error, testName);
      return {
        success: false,
        error: apiError,
      };
    } finally {
      controller.abort();
    }
  }

  /**
   * Make a DELETE request and log the results
   */
  async delete(
    path: string,
    testName: string,
    options: {
      headers?: Record<string, string>;
    } = {},
  ): Promise<ApiTestResult> {
    const url = `${this.config.baseUrl}${path}`;
    const headers = { ...this.config.defaultHeaders, ...options.headers };
    const controller = new AbortController();

    try {
      logApiCall('DELETE', url, headers);

      const response: AxiosResponse = await axios.delete(url, {
        headers,
        timeout: this.config.timeout,
        signal: controller.signal,
      });

      const apiResponse: ApiResponse = {
        status: response.status,
        headers: ContractApiClient.normalizeHeaders(response.headers),
        data: response.data,
      };

      logApiResponse(testName, apiResponse);

      return {
        success: true,
        response: apiResponse,
      };
    } catch (error) {
      const apiError = this.handleAxiosError(error, testName);
      return {
        success: false,
        error: apiError,
      };
    } finally {
      controller.abort();
    }
  }

  /**
   * Handle axios errors consistently
   */
  private handleAxiosError(error: unknown, testName: string): ApiError {
    if (axios.isAxiosError(error)) {
      const err: AxiosError = error;
      const apiError: ApiError = {
        status: err.response?.status,
        headers: ContractApiClient.normalizeHeaders(err.response?.headers),
        data: err.response?.data,
        message: err.message,
      };

      logApiError(testName, apiError);
      return apiError;
    }

    const genericError: ApiError = {
      message: error instanceof Error ? error.message : 'Unknown error',
    };

    logApiError(testName, genericError);
    return genericError;
  }
}
