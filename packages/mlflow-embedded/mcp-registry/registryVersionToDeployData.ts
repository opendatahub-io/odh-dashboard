import {
  MCPServer,
  MCPServerJSONPackage,
  MCPServerJSONRemote,
  MCPServerVersion,
  MCPTransportType,
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
  remotes?.find((remote) => remote.type === MCPTransportType.STREAMABLE_HTTP) ?? remotes?.[0];

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

export const registryVersionToDeployData = (
  server: MCPServer,
  version: MCPServerVersion,
): Omit<McpRegistryDeployData, 'namespace'> => {
  const remote = pickRemoteEntry(version.server_json.remotes);
  const pkg = pickRemoteCapablePackage(version.server_json.packages);
  const meta = version.server_json._meta;

  return {
    registryServer: server.name,
    registryVersion: version.version,
    displayName: `${server.display_name ?? server.name} - ${version.version}`,
    image: meta?.image ?? '',
    yaml: meta?.configuration ?? '',
    transportType: resolveEndpointTransportType(remote, pkg),
  };
};
