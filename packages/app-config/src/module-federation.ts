import type { ModuleFederationConfig } from './types';

export const MF_PATH_PREFIX = '/_mf';

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
