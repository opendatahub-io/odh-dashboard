/* eslint-disable no-console, @typescript-eslint/no-unsafe-assignment */
import axios from 'axios';
import { logApiCall, logApiResponse, logApiError } from '../helpers/logging';

export interface BffConfig {
  url: string;
  healthcheckPath?: string;
  headers?: Record<string, string>;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface BffHealthResult {
  isHealthy: boolean;
  status?: number;
  error?: string;
}

/**
 * Default BFF configuration
 */
export const DEFAULT_BFF_CONFIG: Partial<BffConfig> = {
  healthcheckPath: '/healthcheck',
  timeout: 5000,
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * Check if a BFF server is healthy and ready for testing
 */
export async function verifyBffHealth(config: BffConfig): Promise<BffHealthResult> {
  const fullConfig = { ...DEFAULT_BFF_CONFIG, ...config };
  const healthUrl = `${fullConfig.url}${fullConfig.healthcheckPath}`;
  
  try {
    logApiCall('GET', healthUrl, fullConfig.headers || {});
    
    const response = await axios.get(healthUrl, {
      headers: fullConfig.headers,
      timeout: fullConfig.timeout,
    });
    
    logApiResponse('BFF Health Check', {
      status: response.status,
      headers: response.headers as any,
      data: response.data,
    });
    
    console.log('✅ Mock BFF Health Check Passed');
    console.log(`📊 Health Status: ${response.status}`);
    
    return {
      isHealthy: response.status === 200,
      status: response.status,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logApiError('BFF Health Check', {
      message: errorMessage,
      status: axios.isAxiosError(error) ? error.response?.status : undefined,
      headers: axios.isAxiosError(error) ? (error.response?.headers as any) : undefined,
      data: axios.isAxiosError(error) ? error.response?.data : undefined,
    });
    
    return {
      isHealthy: false,
      error: errorMessage,
    };
  }
}

/**
 * Wait for BFF to become healthy with retries
 */
export async function waitForBffHealth(config: BffConfig): Promise<BffHealthResult> {
  const fullConfig = { ...DEFAULT_BFF_CONFIG, ...config };
  
  for (let attempt = 1; attempt <= (fullConfig.maxRetries || 3); attempt++) {
    console.log(`🔄 Health check attempt ${attempt}/${fullConfig.maxRetries}...`);
    
    const result = await verifyBffHealth(config);
    
    if (result.isHealthy) {
      return result;
    }
    
    if (attempt < (fullConfig.maxRetries || 3)) {
      console.log(`⏳ Waiting ${fullConfig.retryDelay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, fullConfig.retryDelay));
    }
  }
  
  return {
    isHealthy: false,
    error: `BFF failed to become healthy after ${fullConfig.maxRetries} attempts`,
  };
}

/**
 * Create standard BFF configuration for ODH Dashboard packages
 */
export function createBffConfig(packageName: string, port = 8080): BffConfig {
  return {
    url: `http://localhost:${port}`,
    healthcheckPath: '/healthcheck',
    headers: {
      'kubeflow-userid': 'user@example.com', // Standard test user
    },
    timeout: 5000,
    maxRetries: 3,
    retryDelay: 1000,
  };
}
