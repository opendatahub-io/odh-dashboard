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
function redactSecrets(input: string): string {
  const patterns = /(authorization|token|password|secret|apiKey)\s*[:=]\s*([^\s,;]+)/gi;
  return input.replace(patterns, (m, k) => `${k}:****`);
}

function safeStringify(payload: unknown, maxLen = 500): string | undefined {
  try {
    if (payload == null) return undefined;
    if (typeof payload === 'string') return redactSecrets(payload).slice(0, maxLen);
    const s = JSON.stringify(payload);
    return redactSecrets(s).slice(0, maxLen);
  } catch {
    return undefined;
  }
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
export async function verifyBffHealth(inputConfig: Partial<BffConfig>): Promise<BffHealthResult> {
  const bffConfig = createBffConfig(inputConfig);
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
    if (axios.isAxiosError(error)) {
      const { status, data } = error.response ?? {};
      const { code, config } = error;
      const url = config?.url;
      const dataPreview = safeStringify(data);

      const parts = [
        status !== undefined ? `status=${status}` : undefined,
        code ? `code=${code}` : undefined,
        url ? `url=${url}` : undefined,
        error.message ? `message=${error.message}` : undefined,
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

/**
 * Ensure BFF is healthy or throw with a helpful error message.
 */
export async function ensureBffHealthy(config: Partial<BffConfig>): Promise<void> {
  const result = await waitForBffHealth({ ...config, maxRetries: 20, retryDelay: 500 });
  if (!result.isHealthy) {
    const reason = result.error ? ` (${result.error})` : '';
    throw new Error(`❌ Mock BFF is not healthy${reason}`);
  }
}
