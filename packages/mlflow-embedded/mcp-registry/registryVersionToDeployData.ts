import yaml from 'js-yaml';
import {
  MCPServer,
  MCPServerDeploySpec,
  MCPServerJSONPackage,
  MCPServerJSONRemote,
  MCPServerVersion,
  MCPTransportType,
  RHAI_DEPLOY_SPEC_META_KEY,
} from './types';
import { McpRegistryDeployData } from './deployTypes';

const pickRemoteCapablePackage = (
  packages?: MCPServerJSONPackage[],
): MCPServerJSONPackage | undefined =>
  packages?.find(
    (pkg) =>
      pkg.transport.type === MCPTransportType.STREAMABLE_HTTP ||
      pkg.transport.type === MCPTransportType.SSE,
  ) ?? packages?.[0];

const pickRemoteEntry = (remotes?: MCPServerJSONRemote[]): MCPServerJSONRemote | undefined =>
  remotes?.find((remote) => remote.type === MCPTransportType.STREAMABLE_HTTP) ??
  remotes?.find((remote) => remote.type === MCPTransportType.SSE);

// `remotes` is the field that actually declares a network-reachable transport (see
// MCPServerJSONRemote); `packages` frequently use `stdio` for locally-launched processes.
// Prefer `remotes` when present, and only fall back to inspecting `packages` for registry
// entries published without a `remotes` array.
const resolveEndpointTransportType = (
  remote?: MCPServerJSONRemote,
  pkg?: MCPServerJSONPackage,
): MCPTransportType => {
  const transportType = remote?.type ?? pkg?.transport.type;
  return transportType === MCPTransportType.SSE
    ? MCPTransportType.SSE
    : MCPTransportType.STREAMABLE_HTTP;
};

// Mirrors model-registry's `mcpServerCRToYaml`.
const deploySpecToYaml = (deploySpec?: MCPServerDeploySpec): string => {
  if (!deploySpec) {
    return '';
  }
  const editableSpec: Record<string, unknown> = {};
  if (deploySpec.runtime) {
    editableSpec.runtime = deploySpec.runtime;
  }
  editableSpec.config = deploySpec.config;

  return yaml.dump(editableSpec, { lineWidth: -1, noRefs: true });
};

export const registryVersionToDeployData = (
  server: MCPServer,
  version: MCPServerVersion,
): Omit<McpRegistryDeployData, 'namespace'> => {
  const remote = pickRemoteEntry(version.server_json.remotes);
  const pkg = pickRemoteCapablePackage(version.server_json.packages);
  const deploySpec = version.server_json._meta?.[RHAI_DEPLOY_SPEC_META_KEY];

  return {
    registryServer: server.name,
    registryVersion: version.version,
    displayName: `${server.display_name ?? server.name} - ${version.version}`,
    image: deploySpec?.source.containerImage?.ref ?? '',
    yaml: deploySpecToYaml(deploySpec),
    transportType: resolveEndpointTransportType(remote, pkg),
  };
};
