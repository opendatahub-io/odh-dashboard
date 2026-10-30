import * as http from 'http';
import * as https from 'https';
import { execFile } from 'child_process';
import { getHttpsProxyAgent } from '../../../src/e2e-proxy/proxyAgent';

type DataRegistryDeleteResponse = {
  status: number;
  body: unknown;
  headers: Record<string, unknown>;
};

type DataRegistryDeleteRequestResult =
  | { response: DataRegistryDeleteResponse }
  | { transportError: string }
  | { tokenError: string };

type DataRegistryDeleteTaskArgs = {
  origin: string;
  path: string;
};

type DataRegistryHttpRequest = (
  requestUrl: URL,
  options: http.RequestOptions,
  callback: (response: http.IncomingMessage) => void,
) => http.ClientRequest;

type CypressTaskConfig = {
  baseUrl?: string | null;
  env: Record<string, unknown>;
};

const isDataRegistryDeleteTaskArgs = (args: unknown): args is DataRegistryDeleteTaskArgs =>
  typeof args === 'object' &&
  args !== null &&
  'origin' in args &&
  typeof args.origin === 'string' &&
  'path' in args &&
  typeof args.path === 'string';

const dataRegistryDeleteTimeoutMs = 70_000;

const getDataRegistryDeleteUrl = (
  args: DataRegistryDeleteTaskArgs,
  config: CypressTaskConfig,
): URL | { transportError: string } => {
  try {
    // The browser supplies this origin; allow only configured dashboard origins.
    const requestedOrigin = new URL(args.origin);
    const trustedOrigins = [config.baseUrl, config.env.ODH_DASHBOARD_CANONICAL_URL]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .flatMap((value) => {
        try {
          return [new URL(value).origin];
        } catch {
          return [];
        }
      });

    if (
      requestedOrigin.origin !== args.origin ||
      !['http:', 'https:'].includes(requestedOrigin.protocol) ||
      !trustedOrigins.includes(requestedOrigin.origin)
    ) {
      return { transportError: 'Refusing Data Registry DELETE to an untrusted origin' };
    }

    const requestUrl = new URL(args.path, requestedOrigin.origin);
    if (
      requestUrl.origin !== requestedOrigin.origin ||
      !requestUrl.pathname.startsWith('/data-registry/api/v1/') ||
      requestUrl.search ||
      requestUrl.hash
    ) {
      return { transportError: 'Refusing an invalid Data Registry DELETE path' };
    }

    return requestUrl;
  } catch {
    return { transportError: 'Refusing an invalid Data Registry DELETE URL' };
  }
};

const getOpenShiftToken = (): Promise<string | { tokenError: string }> =>
  new Promise((resolve) => {
    execFile('oc', ['whoami', '-t'], { encoding: 'utf8' }, (error, stdout, stderr) => {
      const token = stdout.trim();
      if (error || !token) {
        resolve({
          tokenError: stderr.trim() || error?.message || 'oc whoami -t returned no token',
        });
        return;
      }
      resolve(token);
    });
  });

export const requestDataRegistryDelete = (
  requestUrl: URL,
  token: string,
  requestFunction?: DataRegistryHttpRequest,
): Promise<DataRegistryDeleteRequestResult> =>
  new Promise((resolve) => {
    const requestModule = requestUrl.protocol === 'https:' ? https : http;
    const sendRequest = requestFunction ?? (requestModule.request as DataRegistryHttpRequest);
    let settled = false;
    const finish = (result: DataRegistryDeleteRequestResult): void => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(result);
      }
    };

    let request: http.ClientRequest | undefined;
    const timeout = setTimeout(
      () => request?.destroy(new Error(`Request timed out after ${dataRegistryDeleteTimeoutMs}ms`)),
      dataRegistryDeleteTimeoutMs,
    );
    try {
      request = sendRequest(
        requestUrl,
        {
          method: 'DELETE',
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          agent: requestUrl.protocol === 'https:' ? getHttpsProxyAgent(requestUrl.href) : undefined,
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
          response.on('error', (error: Error) => finish({ transportError: error.message }));
          response.on('end', () => {
            const responseText = Buffer.concat(chunks).toString('utf8');
            let body: unknown;
            if (responseText) {
              try {
                body = JSON.parse(responseText);
              } catch {
                body = responseText;
              }
            }
            finish({
              response: {
                status: response.statusCode ?? 0,
                body,
                headers: { 'content-type': response.headers['content-type'] },
              },
            });
          });
        },
      );
    } catch (error) {
      finish({ transportError: error instanceof Error ? error.message : String(error) });
      return;
    }

    request.on('error', (error: Error) => finish({ transportError: error.message }));
    request.end();
  });

/**
 * Creates a Node-side task for deleting Data Registry resources without exposing the token to app code.
 */
type DataRegistryDeleteTaskDependencies = {
  getOpenShiftToken?: typeof getOpenShiftToken;
  requestDataRegistryDelete?: typeof requestDataRegistryDelete;
};

export const createDataRegistryDeleteTask =
  (config: CypressTaskConfig, dependencies: DataRegistryDeleteTaskDependencies = {}) =>
  (args: unknown): Promise<DataRegistryDeleteRequestResult> => {
    if (!isDataRegistryDeleteTaskArgs(args)) {
      return Promise.resolve({
        transportError: 'Invalid Data Registry DELETE request arguments',
      });
    }

    const requestUrl = getDataRegistryDeleteUrl(args, config);
    if (!(requestUrl instanceof URL)) {
      return Promise.resolve(requestUrl);
    }

    const getToken = dependencies.getOpenShiftToken ?? getOpenShiftToken;
    const sendRequest = dependencies.requestDataRegistryDelete ?? requestDataRegistryDelete;

    return getToken().then((tokenResult) => {
      if (typeof tokenResult !== 'string') {
        return tokenResult;
      }
      return sendRequest(requestUrl, tokenResult);
    });
  };

export const setupDataRegistryTasks = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
): void => {
  on('task', {
    deleteDataRegistryResource: createDataRegistryDeleteTask(config),
  });
};
