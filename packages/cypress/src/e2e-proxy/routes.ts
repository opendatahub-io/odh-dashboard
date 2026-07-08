import fs from 'fs';
import path from 'path';
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

export type TestConfig = Record<string, unknown>;

function loadTestConfig(): TestConfig {
  const configPath =
    process.env.CY_TEST_CONFIG || path.resolve(__dirname, '../../test-variables.yml');
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `test-variables.yml not found at ${configPath}. Set CY_TEST_CONFIG or CLUSTER_URL env var.`,
    );
  }
  const loaded = YAML.load(fs.readFileSync(configPath, 'utf8'));
  if (loaded == null || typeof loaded !== 'object' || Array.isArray(loaded)) {
    throw new Error(`Invalid test config at ${configPath}: expected a YAML object`);
  }
  return Object.fromEntries(Object.entries(loaded));
}

let cachedConfig: TestConfig | undefined;

function getTestConfig(): TestConfig {
  if (!cachedConfig) {
    cachedConfig = loadTestConfig();
  }
  return cachedConfig;
}

export function getClusterUrl(): string {
  if (process.env.CLUSTER_URL) {
    return process.env.CLUSTER_URL;
  }
  const config = getTestConfig();
  const raw = config.ODH_DASHBOARD_URL;
  const url = typeof raw === 'string' ? raw : undefined;
  if (!url) {
    throw new Error(`ODH_DASHBOARD_URL not found in test config`);
  }
  return url;
}

export function getOcpApiUrl(): string {
  if (process.env.OCP_API_URL) {
    return process.env.OCP_API_URL;
  }
  const config = getTestConfig();
  const raw = config.OCP_API_URL;
  const url = typeof raw === 'string' ? raw : undefined;
  if (!url) {
    throw new Error(`OCP_API_URL not found in test config`);
  }
  return url;
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
