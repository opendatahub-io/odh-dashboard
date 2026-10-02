import { MCPServerFromAPI, TokenInfo } from '~/app/types';
import { AgentProfileSpec } from '~/app/agentProfile/types';

const resolveMCPServer = (
  selectedServer: NonNullable<AgentProfileSpec['mcpServers']>[number],
  mcpServers: MCPServerFromAPI[],
): { id: string; server?: MCPServerFromAPI } | undefined => {
  const isRegistryServer = 'source' in selectedServer;
  const id = isRegistryServer ? selectedServer.name : selectedServer.serverRef.key;
  if (!id) {
    return undefined;
  }

  return {
    id,
    server: mcpServers.find(
      (candidate) =>
        candidate.name === id && candidate.source === (isRegistryServer ? 'registry' : 'configmap'),
    ),
  };
};

/**
 * Converts the transient MCP credentials entered in Playground into the deployment
 * request format. Credentials are retained only for selected servers and only while
 * this Playground page is open.
 */
export const getMCPServerAuth = (
  profile: AgentProfileSpec,
  mcpServers: MCPServerFromAPI[],
  serverTokens: Map<string, TokenInfo>,
): Record<string, string> | undefined => {
  const authorizations: Record<string, string> = {};

  for (const selectedServer of profile.mcpServers ?? []) {
    const resolvedServer = resolveMCPServer(selectedServer, mcpServers);
    if (!resolvedServer?.server) {
      continue;
    }
    const tokenInfo = serverTokens.get(resolvedServer.server.url);

    if (tokenInfo?.authenticated && tokenInfo.token.trim()) {
      authorizations[resolvedServer.id] = tokenInfo.token;
    }
  }

  return Object.keys(authorizations).length > 0 ? authorizations : undefined;
};
