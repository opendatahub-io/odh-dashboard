import * as path from 'path';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import { buildRoutes, getOcpApiUrl } from './routes';
import { createProxyServer, seedSession } from './server';

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..', '..');
const env = process.env.NODE_ENV || 'development';

dotenv.config({ path: path.resolve(ROOT_DIR, `.env.${env}.local`) });
dotenv.config({ path: path.resolve(ROOT_DIR, `.env.${env}`) });
dotenv.config({ path: path.resolve(ROOT_DIR, '.env.local') });
dotenv.config({ path: path.resolve(ROOT_DIR, '.env') });

const PROXY_PORT = Number(process.env.PROXY_PORT) || 4040;
const BACKEND_PORT = Number(process.env.BACKEND_PORT) || 4000;

const routingTable = buildRoutes(BACKEND_PORT);

// Seed session from the current oc login
try {
  const token = execSync('oc whoami --show-token', { encoding: 'utf-8' }).trim();
  const username = execSync('oc whoami', { encoding: 'utf-8' }).trim();
  if (token && username) {
    seedSession({ token, username, ocpApiUrl: getOcpApiUrl() });
    console.log(`[e2e-proxy] Seeded session for ${username}`);
  }
} catch {
  console.warn('[e2e-proxy] Could not seed session from oc (not logged in?)');
}

const server = createProxyServer(routingTable, PROXY_PORT);

function shutdown() {
  console.log('[e2e-proxy] Shutting down...');
  server.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
