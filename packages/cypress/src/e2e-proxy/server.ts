import http from 'http';
import type { Socket } from 'net';
import { execFileSync } from 'child_process';
import httpProxy from 'http-proxy';
import type { ProxyRoute, RoutingTable } from './routes';
import { getOcpApiUrl } from './routes';

const isSocket = (obj: unknown): obj is Socket =>
  obj != null && typeof obj === 'object' && !('writeHead' in obj);

const TMP_KUBECONFIG = '/tmp/cypress-e2e.kubeconfig';

type LogLevel = 'error' | 'info' | 'debug';
const LOG_LEVELS: Record<LogLevel, number> = { error: 0, info: 1, debug: 2 };

let currentLevel: number = LOG_LEVELS.info;

export function setLogLevel(level: LogLevel): void {
  currentLevel = LOG_LEVELS[level];
}

export const log = {
  error: (...args: unknown[]): void => console.error('[e2e-proxy]', ...args),
  info: (...args: unknown[]): void => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log('[e2e-proxy]', ...args);
    }
  },
  debug: (...args: unknown[]): void => {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.log('[e2e-proxy]', ...args);
    }
  },
};

let storedAccessToken: string | undefined;
let storedUsername: string | undefined;

export function seedSession(opts: { token: string; username: string }): void {
  storedAccessToken = opts.token;
  storedUsername = opts.username;
}

function matchClusterRoute(url: string, clusterRoutes: ProxyRoute[]): ProxyRoute | undefined {
  const path = url.split('?')[0];
  for (const route of clusterRoutes) {
    if (path.startsWith(`${route.pattern}/`) || path === route.pattern) {
      return route;
    }
  }
  return undefined;
}

function injectAuth(req: http.IncomingMessage, clusterRoute: ProxyRoute | undefined): void {
  if (!storedAccessToken) {
    return;
  }
  const { headers } = req;
  if (clusterRoute) {
    headers.authorization = `Bearer ${storedAccessToken}`;
  } else {
    headers['x-forwarded-access-token'] = storedAccessToken;
  }
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

function handleE2eLogin(body: string, res: http.ServerResponse): void {
  let parsed: { username?: string; password?: string };
  try {
    parsed = JSON.parse(body);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON body' }));
    return;
  }

  const { username, password } = parsed;
  if (!username || !password) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'username and password are required' }));
    return;
  }

  const ocpApiUrl = getOcpApiUrl();

  try {
    execFileSync(
      'oc',
      [
        'login',
        '-u',
        username,
        '-p',
        password,
        `--server=${ocpApiUrl}`,
        '--insecure-skip-tls-verify',
        `--kubeconfig=${TMP_KUBECONFIG}`,
      ],
      { encoding: 'utf-8', stdio: 'pipe' },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error(`oc login failed for ${username}: ${msg}`);
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'oc login failed', message: msg }));
    return;
  }

  let token: string;
  try {
    token = execFileSync('oc', ['whoami', '--show-token', `--kubeconfig=${TMP_KUBECONFIG}`], {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error(`oc whoami --show-token failed: ${msg}`);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to obtain token', message: msg }));
    return;
  }

  storedAccessToken = token;
  storedUsername = username;
  log.info(`Logged in as ${username}, token stored`);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ user: username }));
}

export function createProxyServer(routingTable: RoutingTable, port: number): http.Server {
  const proxy = httpProxy.createProxyServer({
    changeOrigin: true,
    secure: false,
    ws: true,
  });

  proxy.on('proxyReq', (proxyReq, req) => {
    const url = req.url || '/';
    if (url.startsWith('/api/service')) {
      log.debug(`>> ${proxyReq.method} ${proxyReq.path}`);
      log.debug(`>> Host: ${String(proxyReq.getHeader('host'))}`);
    }
  });

  proxy.on('proxyRes', (proxyRes, req) => {
    const url = req.url || '/';
    if (url.startsWith('/api/service')) {
      log.debug(`<< ${proxyRes.statusCode ?? 0} ${proxyRes.statusMessage ?? ''} for ${url}`);
      if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
        let body = '';
        proxyRes.on('data', (chunk) => {
          body += chunk;
        });
        proxyRes.on('end', () => {
          log.info(`<< ${String(proxyRes.statusCode)} ${url} Body: ${body.slice(0, 500)}`);
        });
      }
    }
  });

  proxy.on('error', (err, req, res) => {
    const errorMessage = err.message || String(err) || 'Unknown proxy error';
    log.error(`Proxy error for ${req.url ?? '/'}: ${errorMessage}`);
    if (isSocket(res)) {
      // WebSocket proxy error — destroy the client socket so the browser gets a clean close
      if (!res.destroyed) {
        res.destroy();
      }
    } else if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad Gateway', message: errorMessage }));
    }
  });

  proxy.on('open', (proxySocket) => {
    log.debug(`WS connection opened (remote ${proxySocket.remoteAddress ?? 'unknown'})`);
  });

  proxy.on('close', (_res, socket) => {
    const addr = socket.remoteAddress ?? 'unknown';
    log.debug(`WS connection closed (remote ${addr})`);
  });

  const server = http.createServer(async (req, res) => {
    const url = req.url || '/';

    if (url === '/healthcheck') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (url === '/e2e-login' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ username: storedUsername ?? null }));
      return;
    }

    if (url === '/e2e-login' && req.method === 'POST') {
      const body = await readBody(req);
      handleE2eLogin(body, res);
      return;
    }

    const clusterRoute = matchClusterRoute(url, routingTable.clusterRoutes);
    const target = clusterRoute?.target ?? routingTable.defaultTarget;

    log.debug(`${req.method ?? ''} ${url} → ${clusterRoute ? 'cluster' : 'backend'} (${target})`);

    injectAuth(req, clusterRoute);
    proxy.web(req, res, { target });
  });

  server.on('upgrade', (req: http.IncomingMessage, socket: Socket, head: Buffer) => {
    const url = req.url || '/';
    const clusterRoute = matchClusterRoute(url, routingTable.clusterRoutes);
    const target = clusterRoute?.target ?? routingTable.defaultTarget;

    log.debug(`WS upgrade ${url} → ${clusterRoute ? 'cluster' : 'backend'} (${target})`);

    socket.on('error', (err) => {
      log.error(`WS client socket error during upgrade for ${url}: ${err.message}`);
    });

    injectAuth(req, clusterRoute);
    proxy.ws(req, socket, head, { target });
  });

  server.listen(port, '127.0.0.1', () => {
    log.info(`Listening on http://127.0.0.1:${port}`);
  });

  return server;
}
