import { MCPServer, MCPServerJSONPackage, MCPServerVersion, MCPTransportType } from './types';
import { McpRegistryDeployData } from './deployTypes';

const pickRemoteCapablePackage = (
  packages?: MCPServerJSONPackage[],
): MCPServerJSONPackage | undefined =>
  packages?.find(
    (pkg) =>
      pkg.transport.type === MCPTransportType.STREAMABLE_HTTP ||
      pkg.transport.type === MCPTransportType.SSE,
  ) ?? packages?.[0];

const resolveEndpointTransportType = (pkg?: MCPServerJSONPackage): MCPTransportType =>
  pkg?.transport.type === MCPTransportType.SSE
    ? MCPTransportType.SSE
    : MCPTransportType.STREAMABLE_HTTP;

export const registryVersionToDeployData = (
  server: MCPServer,
  version: MCPServerVersion,
): Omit<McpRegistryDeployData, 'namespace'> => {
  const pkg = pickRemoteCapablePackage(version.server_json.packages);
  const meta = version.server_json._meta;

  return {
    registryServer: server.name,
    registryVersion: version.version,
    displayName: `${server.display_name ?? server.name} - ${version.version}`,
    image: meta?.image ?? '',
    yaml: meta?.configuration ?? '',
    transportType: resolveEndpointTransportType(pkg),
  };
};
