import axios from 'axios';

export interface BffConfig {
  url: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  healthEndpoint?: string;
}

export interface BffHealthResult {
  healthy: boolean;
  status?: number;
  error?: string;
  responseTime?: number;
}

export const DEFAULT_BFF_CONFIG: BffConfig = {
  url: 'http://localhost:8080',
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
  healthEndpoint: '/health',
};

export function createBffConfig(config: Partial<BffConfig> = {}): BffConfig {
  return { ...DEFAULT_BFF_CONFIG, ...config };
}

export async function verifyBffHealth(config: Partial<BffConfig> = {}): Promise<BffHealthResult> {
  const finalConfig = createBffConfig(config);

  try {
    const startTime = Date.now();
    const healthEndpoint = finalConfig.healthEndpoint ?? '/health';
    const response = await axios.get(`${finalConfig.url}${healthEndpoint}`, {
      timeout: finalConfig.timeout,
    });
    const responseTime = Date.now() - startTime;

    return {
      healthy: response.status === 200,
      status: response.status,
      responseTime,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function waitForBffHealth(
  config: Partial<BffConfig> = {},
  maxWaitTime = 30000,
): Promise<BffHealthResult> {
  const finalConfig = createBffConfig(config);
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const result = await verifyBffHealth(finalConfig);

    if (result.healthy) {
      return result;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, finalConfig.retryDelay);
    });
  }

  return {
    healthy: false,
    error: 'BFF health check timeout',
  };
}

export async function ensureBffHealthy(config: Partial<BffConfig> = {}): Promise<void> {
  const result = await waitForBffHealth(config);

  if (!result.healthy) {
    const errorMessage = result.error || 'Unknown error';
    throw new Error(`BFF is not healthy: ${errorMessage}`);
  }
}
