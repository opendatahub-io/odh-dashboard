import axios, { AxiosRequestConfig } from 'axios';

export interface ApiTestConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
}

export interface ApiTestResult {
  status: number;
  data: unknown;
  headers: Record<string, unknown>;
}

export class ContractApiClient {
  private config: ApiTestConfig;

  constructor(config: ApiTestConfig) {
    this.config = {
      timeout: 10000,
      ...config,
    };
  }

  async get(path: string, testName: string, config?: AxiosRequestConfig): Promise<ApiTestResult> {
    const response = await axios.get(`${this.config.baseUrl}${path}`, {
      ...config,
      timeout: this.config.timeout,
      headers: {
        ...this.config.defaultHeaders,
        ...config?.headers,
      },
    });

    return {
      status: response.status,
      data: response.data,
      headers: {},
    };
  }

  async post(
    path: string,
    data: unknown,
    testName: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiTestResult> {
    const response = await axios.post(`${this.config.baseUrl}${path}`, data, {
      ...config,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.defaultHeaders,
        ...config?.headers,
      },
    });

    return {
      status: response.status,
      data: response.data,
      headers: {},
    };
  }

  async put(
    path: string,
    data: unknown,
    testName: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiTestResult> {
    const response = await axios.put(`${this.config.baseUrl}${path}`, data, {
      ...config,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.defaultHeaders,
        ...config?.headers,
      },
    });

    return {
      status: response.status,
      data: response.data,
      headers: {},
    };
  }

  async delete(
    path: string,
    testName: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiTestResult> {
    const response = await axios.delete(`${this.config.baseUrl}${path}`, {
      ...config,
      timeout: this.config.timeout,
      headers: {
        ...this.config.defaultHeaders,
        ...config?.headers,
      },
    });

    return {
      status: response.status,
      data: response.data,
      headers: {},
    };
  }
}
