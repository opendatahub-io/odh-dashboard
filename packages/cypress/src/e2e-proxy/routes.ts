import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import YAML from 'js-yaml';
import { getModuleFederationConfigs, type ModuleFederationConfig } from '@odh-dashboard/app-config';
import { log } from './server';

export type ProxyRoute = {
  pattern: string;
  target: string;
};

export type RoutingTable = {
  clusterRoutes: ProxyRoute[];
  defaultTarget: string;
};

export function getClusterUrl(): string {
  if (process.env.ODH_DASHBOARD_URL) {
    return process.env.ODH_DASHBOARD_URL.replace(/\/+$/, '');
  }

  const configPath =
    process.env.CY_TEST_CONFIG || path.resolve(__dirname, '../../test-variables.yml');
  if (fs.existsSync(configPath)) {
    const loaded = YAML.load(fs.readFileSync(configPath, 'utf8'));
    if (
      loaded &&
      typeof loaded === 'object' &&
      !Array.isArray(loaded) &&
      'ODH_DASHBOARD_URL' in loaded
    ) {
      const raw: unknown = loaded.ODH_DASHBOARD_URL;
      if (typeof raw === 'string' && raw) {
        return raw.replace(/\/+$/, '');
      }
    }
  }

  throw new Error('ODH_DASHBOARD_URL not found. Set it as an env var or in test-variables.yml.');
}

export function getOcpApiUrl(): string {
  if (process.env.OCP_API_URL) {
    return process.env.OCP_API_URL;
  }
  try {
    return execFileSync('oc', ['whoami', '--show-server'], {
      stdio: ['pipe', 'pipe', 'ignore'],
      encoding: 'utf-8',
    }).trim();
  } catch {
    throw new Error('Could not determine OCP API URL. Set OCP_API_URL or log in with `oc login`.');
  }
}

export function buildRoutes(backendPort: number): RoutingTable {
  const clusterUrl = getClusterUrl();
  const configs: ModuleFederationConfig[] = getModuleFederationConfigs(true);
  const clusterRoutes: ProxyRoute[] = [];

  clusterRoutes.push({ pattern: '/api/service', target: clusterUrl });

  for (const config of configs) {
    for (const ps of config.proxyService ?? []) {
      if (ps.service.name !== 'odh-dashboard') {
        clusterRoutes.push({ pattern: ps.path, target: clusterUrl });
      }
    }
  }

  log.debug(`Cluster URL: ${clusterUrl}`);
  log.debug(`Cluster routes: ${clusterRoutes.map((r) => r.pattern).join(', ')}`);
  log.debug(`Default target (backend): http://localhost:${backendPort}`);

  return {
    clusterRoutes,
    defaultTarget: `http://localhost:${backendPort}`,
  };
}
