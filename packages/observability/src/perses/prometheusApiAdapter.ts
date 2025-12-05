/**
 * Prometheus API Adapter
 *
 * The Perses Prometheus plugin makes standard Prometheus GET requests like:
 * GET /api/prometheus/api/v1/query?query=...
 * GET /api/prometheus/api/v1/query_range?query=...&start=...&end=...&step=...
 *
 * However, our backend expects POST requests:
 * POST /api/prometheus/query with body { query: string }
 * POST /api/prometheus/queryRange with body { query: string }
 *
 * This adapter intercepts fetch requests and transforms them appropriately.
 */

const originalFetch = window.fetch;

/**
 * Transform a Prometheus GET request to the backend POST format
 */
function transformPrometheusRequest(
  url: string,
  init?: RequestInit,
): { url: string; init: RequestInit } | null {
  try {
    const urlObj = new URL(url, window.location.origin);
    const { pathname } = urlObj;

    // Check if this is a Prometheus API call through our backend
    if (!pathname.startsWith('/api/prometheus')) {
      return null;
    }

    // Get the query parameter
    const query = urlObj.searchParams.get('query');

    if (!query) {
      return null;
    }

    // Handle /api/v1/query endpoint (instant query)
    if (pathname.includes('/api/v1/query') && !pathname.includes('query_range')) {
      return {
        url: '/api/prometheus/query',
        init: {
          ...init,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
          },
          body: JSON.stringify({ query }),
        },
      };
    }

    // Handle /api/v1/query_range endpoint (range query)
    if (pathname.includes('/api/v1/query_range')) {
      // Note: The backend's queryRange endpoint only takes the query
      // and the backend handles the time range parameters
      return {
        url: '/api/prometheus/queryRange',
        init: {
          ...init,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
          },
          body: JSON.stringify({ query }),
        },
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Transform the backend response to match Prometheus API format
 */
async function transformResponse(response: Response): Promise<Response> {
  try {
    const data = await response.json();

    // The backend wraps the response in { code, response }
    if (data && typeof data.code === 'number' && data.response) {
      return new Response(JSON.stringify(data.response), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    // If already in correct format, return as-is
    return new Response(JSON.stringify(data), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch {
    return response;
  }
}

/**
 * Adapted fetch function that transforms Prometheus API calls
 */
export async function adaptedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

  const transformed = transformPrometheusRequest(url, init);

  if (transformed) {
    const response = await originalFetch(transformed.url, transformed.init);
    return transformResponse(response);
  }

  // Pass through all other requests
  return originalFetch(input, init);
}

/**
 * Install the Prometheus API adapter
 */
export function installPrometheusApiAdapter(): void {
  window.fetch = adaptedFetch;
}

/**
 * Restore the original fetch
 */
export function uninstallPrometheusApiAdapter(): void {
  window.fetch = originalFetch;
}
