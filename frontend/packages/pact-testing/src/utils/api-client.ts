/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/comma-dangle */
import axios, { AxiosResponse } from 'axios';
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
    } = {}
  ): Promise<ApiTestResult> {
    const url = `${this.config.baseUrl}${path}`;
    const headers = { ...this.config.defaultHeaders, ...options.headers };

    try {
      logApiCall('GET', url, headers);

      const response: AxiosResponse = await axios.get(url, {
        headers,
        params: options.params,
        timeout: this.config.timeout,
      });

      const apiResponse: ApiResponse = {
        status: response.status,
        headers: response.headers as any,
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
    } = {}
  ): Promise<ApiTestResult> {
    const url = `${this.config.baseUrl}${path}`;
    const headers = { 
      'Content-Type': 'application/json',
      ...this.config.defaultHeaders, 
      ...options.headers 
    };

    try {
      logApiCall('POST', url, headers);

      const response: AxiosResponse = await axios.post(url, data, {
        headers,
        timeout: this.config.timeout,
      });

      const apiResponse: ApiResponse = {
        status: response.status,
        headers: response.headers as any,
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
    } = {}
  ): Promise<ApiTestResult> {
    const url = `${this.config.baseUrl}${path}`;
    const headers = { 
      'Content-Type': 'application/json',
      ...this.config.defaultHeaders, 
      ...options.headers 
    };

    try {
      logApiCall('PUT', url, headers);

      const response: AxiosResponse = await axios.put(url, data, {
        headers,
        timeout: this.config.timeout,
      });

      const apiResponse: ApiResponse = {
        status: response.status,
        headers: response.headers as any,
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
    } = {}
  ): Promise<ApiTestResult> {
    const url = `${this.config.baseUrl}${path}`;
    const headers = { ...this.config.defaultHeaders, ...options.headers };

    try {
      logApiCall('DELETE', url, headers);

      const response: AxiosResponse = await axios.delete(url, {
        headers,
        timeout: this.config.timeout,
      });

      const apiResponse: ApiResponse = {
        status: response.status,
        headers: response.headers as any,
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
    }
  }

  /**
   * Handle axios errors consistently
   */
  private handleAxiosError(error: unknown, testName: string): ApiError {
    if (axios.isAxiosError(error)) {
      const apiError: ApiError = {
        status: error.response?.status,
        headers: error.response?.headers as any,
        data: error.response?.data,
        message: error.message,
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
