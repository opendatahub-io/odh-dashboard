import { execSync } from 'child_process';
import type {
  ModuleFederationConfig,
  ModuleFederationConfigOld,
  ProxyService,
  WorkspacePackage,
} from './types';

/**
 * Type guard to check if a config is the old format by checking for `remoteEntry` at the top level.
 * The old format has `remoteEntry` as a required top-level property, while the new format
 * has it nested under `backend.remoteEntry`.
 */
const isOldConfig = (
  config: ModuleFederationConfig | ModuleFederationConfigOld,
): config is ModuleFederationConfigOld => {
  return 'remoteEntry' in config;
};

/**
 * Converts a deprecated ModuleFederationConfigOld to the newer ModuleFederationConfig format.
 *
 * The old format had top-level properties (remoteEntry, tls, authorize, local, service, proxy)
 * that are now organized into `backend` and `proxyService` structures.
 *
 * @param oldConfig - The deprecated config format
 * @returns The converted config in the new format
 */
const convertModuleFederationConfig = (
  oldConfig: ModuleFederationConfigOld,
): ModuleFederationConfig => {
  const { name, remoteEntry, authorize, local, service, proxy, tls } = oldConfig;

  // Normalize service with required namespace (empty string as default)
  const normalizedService = {
    name: service.name,
    namespace: service.namespace ?? process.env.OC_PROJECT ?? '',
    port: service.port,
  };

  return {
    name,
    backend: {
      remoteEntry,
      service: normalizedService,
      ...(authorize !== undefined && { authorize }),
      ...(tls !== undefined && { tls }),
      ...(local && {
        localService: {
          host: local.host,
          port: local.port,
        },
      }),
    },
    proxyService: (proxy ?? []).map((p) => ({
      path: p.path,
      ...(p.pathRewrite && { pathRewrite: p.pathRewrite }),
      service: normalizedService,
      ...(authorize !== undefined && { authorize }),
      ...(tls !== undefined && { tls }),
      ...(local && {
        localService: {
          host: local.host,
          port: local.port,
        },
      }),
    })),
  };
};

/**
 * Get all workspace packages using npm query from frontend directory
 * @returns {Array} Array of workspace package objects
 */
const getWorkspacePackages = (): WorkspacePackage[] => {
  const stdout = execSync('npm query .workspace --json', {
    encoding: 'utf8',
  });
  return JSON.parse(stdout);
};

/**
 * Normalizes a config to the new format, converting from old format if necessary.
 */
const normalizeConfig = (
  config: ModuleFederationConfig | ModuleFederationConfigOld,
): ModuleFederationConfig => {
  return isOldConfig(config) ? convertModuleFederationConfig(config) : config;
};

export const getModuleFederationConfigs = (
  fallbackToPackages = false,
): ModuleFederationConfig[] => {
  try {
    if (process.env.MODULE_FEDERATION_CONFIG) {
      const configs: (ModuleFederationConfig | ModuleFederationConfigOld)[] = JSON.parse(
        process.env.MODULE_FEDERATION_CONFIG,
      );
      return configs.map(normalizeConfig);
    }
    if (fallbackToPackages) {
      return getWorkspacePackages()
        .map((pkg) => pkg['module-federation'])
        .filter((x): x is ModuleFederationConfig | ModuleFederationConfigOld => !!x)
        .map(normalizeConfig);
    }
    return [];
  } catch (e) {
    throw new Error(
      `Failed to process workspace packages for module federation: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }
};

/**
 * Get the local and remote URLs for a proxy service.
 */
export const getModuleFederationURL = ({
  localService,
  service,
}: ProxyService): { local: string; remote: string } => {
  return {
    local: `http://${localService?.host || 'localhost'}:${localService?.port ?? service.port}`,
    remote: `https://${service.name}.${
      service.namespace || process.env.OC_PROJECT || ''
    }.svc.cluster.local:${service.port}`,
  };
};
