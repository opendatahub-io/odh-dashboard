import axios from 'axios';

export interface BffConfig {
  url: string;
  healthEndpoint?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface BffHealthResult {
  isHealthy: boolean;
  error?: string;
}

export const DEFAULT_BFF_CONFIG: BffConfig = {
  url: 'http://localhost:8080',
  healthEndpoint: '/health',
  timeout: 5000,
  maxRetries: 10,
  retryDelay: 1000,
};

/**
 * Create a BFF configuration with defaults
 */
export function createBffConfig(config: Partial<BffConfig>): BffConfig {
  return {
    ...DEFAULT_BFF_CONFIG,
    ...config,
  };
}

/**
 * Verify BFF health by making a request to the health endpoint
 */
export async function verifyBffHealth(config: Partial<BffConfig>): Promise<BffHealthResult> {
  const bffConfig = createBffConfig(config);
  const healthEndpoint = bffConfig.healthEndpoint ?? DEFAULT_BFF_CONFIG.healthEndpoint;
  const healthUrl = bffConfig.url + healthEndpoint;

  try {
    const response = await axios.get(healthUrl, {
      timeout: bffConfig.timeout,
    });

    if (response.status === 200) {
      return {
        isHealthy: true,
      };
    }

    return {
      isHealthy: false,
      error: `Unexpected status code: ${response.status}`,
    };
  } catch (error) {
    // Enrich Axios error diagnostics without throwing
    const anyErr = error as any;
    const isAxios = !!(anyErr && (anyErr.isAxiosError || anyErr.response || anyErr.config));
    if (isAxios) {
      const status = anyErr.response?.status as number | undefined;
      const data = anyErr.response?.data;
      const code = anyErr.code as string | undefined;
      const url = anyErr.config?.url as string | undefined;
      let dataPreview: string | undefined;
      try {
        dataPreview =
          typeof data === 'string' ? data.slice(0, 500) : JSON.stringify(data).slice(0, 500);
      } catch {
        dataPreview = undefined;
      }

      const parts = [
        status !== undefined ? `status=${status}` : undefined,
        code ? `code=${code}` : undefined,
        url ? `url=${url}` : undefined,
        anyErr.message ? `message=${anyErr.message}` : undefined,
        dataPreview ? `data=${dataPreview}` : undefined,
      ].filter(Boolean);

      return {
        isHealthy: false,
        error: parts.join('; '),
      };
    }

    return {
      isHealthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Wait for BFF to become healthy with retries
 */
export async function waitForBffHealth(config: Partial<BffConfig>): Promise<BffHealthResult> {
  const bffConfig = createBffConfig(config);
  const maxRetries = bffConfig.maxRetries ?? DEFAULT_BFF_CONFIG.maxRetries ?? 10;
  const retryDelay = bffConfig.retryDelay ?? DEFAULT_BFF_CONFIG.retryDelay ?? 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await verifyBffHealth(bffConfig);
    if (result.isHealthy) {
      return result;
    }

    if (attempt < maxRetries) {
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), retryDelay);
      });
    }
  }

  return {
    isHealthy: false,
    error: `BFF not healthy after ${maxRetries} attempts`,
  };
}
