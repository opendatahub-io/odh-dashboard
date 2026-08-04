import * as path from 'path';
import { execFileSync } from 'child_process';
import * as dotenv from 'dotenv';
import { buildRoutes } from './routes';
import { createProxyServer, log, seedSession, setLogLevel } from './server';

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..', '..');
const env = process.env.NODE_ENV || 'development';

dotenv.config({ path: path.resolve(ROOT_DIR, `.env.${env}.local`) });
dotenv.config({ path: path.resolve(ROOT_DIR, `.env.${env}`) });
dotenv.config({ path: path.resolve(ROOT_DIR, '.env.local') });
dotenv.config({ path: path.resolve(ROOT_DIR, '.env') });

const logLevel = process.env.E2E_PROXY_LOG_LEVEL;
if (logLevel === 'error' || logLevel === 'info' || logLevel === 'debug') {
  setLogLevel(logLevel);
}

const PROXY_PORT = Number(process.env.PROXY_PORT) || 4040;
const BACKEND_PORT = Number(process.env.BACKEND_PORT) || 4000;

const routingTable = buildRoutes(BACKEND_PORT);

try {
  const token = execFileSync('oc', ['whoami', '--show-token'], { encoding: 'utf-8' }).trim();
  const username = execFileSync('oc', ['whoami'], { encoding: 'utf-8' }).trim();
  if (token && username) {
    seedSession({ token, username });
    log.info(`Seeded session for ${username}`);
  }
} catch {
  log.info('Could not seed session from oc (not logged in?)');
}

const server = createProxyServer(routingTable, PROXY_PORT);

function shutdown() {
  log.info('Shutting down...');
  server.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
