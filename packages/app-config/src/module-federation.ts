import { execSync } from 'child_process';
import type { ModuleFederationConfig, WorkspacePackage } from './types';

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

export const getModuleFederationConfigs = (
  fallbackToPackages = false,
): ModuleFederationConfig[] => {
  try {
    if (process.env.MODULE_FEDERATION_CONFIG) {
      return JSON.parse(process.env.MODULE_FEDERATION_CONFIG);
    }
    if (fallbackToPackages) {
      return getWorkspacePackages()
        .map<ModuleFederationConfig | undefined>((pkg) => pkg['module-federation'])
        .filter((x) => !!x);
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

export const getModuleFederationURL = ({
  tls,
  local,
  service,
}: ModuleFederationConfig): { local: string; remote: string } => {
  const scheme = tls ? 'https' : 'http';
  return {
    local: `${scheme}://${local?.host || 'localhost'}:${local?.port ?? service.port}`,
    remote: `${scheme}://${service.name}.${
      service.namespace || process.env.OC_PROJECT || 'default'
    }.svc.cluster.local:${service.port}`,
  };
};
