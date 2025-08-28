import axios, { AxiosError, AxiosResponse, RawAxiosResponseHeaders } from 'axios';
import { logApiCall, logApiResponse, logApiError, ApiResponse, ApiError } from '../helpers/logging';

export interface ApiTestConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
}

export interface ApiTestResultSuccess {
  success: true;
  response: ApiResponse;
  error?: undefined;
}

export interface ApiTestResultError {
  success: false;
  response?: undefined;
  error: ApiError;
}

export type ApiTestResult = ApiTestResultSuccess | ApiTestResultError;

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

  private static isObjectRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private static hasKey<K extends string>(
    obj: Record<string, unknown>,
    key: K,
  ): obj is Record<K, unknown> {
    return key in obj;
  }

  private static getCurrentTestName(fallback?: string): string {
    try {
      const maybeExpect: unknown = Reflect.get(globalThis, 'expect');
      if (typeof maybeExpect === 'function' || ContractApiClient.isObjectRecord(maybeExpect)) {
        const getStateUnknown: unknown = Reflect.get(maybeExpect, 'getState');
        if (typeof getStateUnknown === 'function') {
          const state = getStateUnknown();
          if (
            ContractApiClient.isObjectRecord(state) &&
            ContractApiClient.hasKey(state, 'currentTestName')
          ) {
            const { currentTestName } = state;
            if (typeof currentTestName === 'string') return currentTestName;
          }
        }
      }
      return fallback ?? '';
    } catch {
      return fallback ?? '';
    }
  }

  /**
   * Make a GET request and log the results
   */
  async get(
    path: string,
    options: {
      headers?: Record<string, string>;
      params?: Record<string, string>;
    } = {},
    testName?: string,
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

      logApiResponse(ContractApiClient.getCurrentTestName(testName || ''), apiResponse);

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
    data: unknown,
    options: {
      headers?: Record<string, string>;
    } = {},
    testName?: string,
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

      logApiResponse(ContractApiClient.getCurrentTestName(testName || ''), apiResponse);

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
    data: unknown,
    options: {
      headers?: Record<string, string>;
    } = {},
    testName?: string,
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

      logApiResponse(ContractApiClient.getCurrentTestName(testName || ''), apiResponse);

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
    options: {
      headers?: Record<string, string>;
    } = {},
    testName?: string,
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

      logApiResponse(ContractApiClient.getCurrentTestName(testName || ''), apiResponse);

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
  private handleAxiosError(error: unknown, testName?: string): ApiError {
    if (axios.isAxiosError(error)) {
      const err: AxiosError = error;
      const apiError: ApiError = {
        status: err.response?.status,
        headers: ContractApiClient.normalizeHeaders(err.response?.headers),
        data: err.response?.data,
        message: err.message,
      };

      logApiError(ContractApiClient.getCurrentTestName(testName || ''), apiError);
      return apiError;
    }

    const genericError: ApiError = {
      message: error instanceof Error ? error.message : 'Unknown error',
    };

    logApiError(ContractApiClient.getCurrentTestName(testName || ''), genericError);
    return genericError;
  }
}
