import type { McpServer, McpTool } from '~/app/mcpServerCatalogTypes';
import { BFF_HOST_PATH } from '~/app/utilities/const';
import type { MCPServerCR } from '~/odh/types/mcpDeploymentTypes';
import type { MCPIcon, MCPTool as RegistryMCPTool } from '~/odh/types/mcpRegistryTypes';

/** Reverse-DNS namespaced `_meta` key used to snapshot deploy-relevant data on a registered version. */
export const RHAI_DEPLOY_SPEC_META_KEY = 'com.redhat/deploy-spec';

const MCP_SERVER_JSON_SCHEMA =
  'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json';

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'server';

const OWNER_REPO_HOSTS = new Set(['github.com', 'www.github.com']);

export const catalogToRegistryName = (server: McpServer): string => {
  const candidateUrl = server.repositoryUrl || server.sourceCode;

  if (candidateUrl) {
    try {
      const { hostname, pathname } = new URL(candidateUrl);
      const segments = pathname.split('/').filter(Boolean);
      if (OWNER_REPO_HOSTS.has(hostname.toLowerCase()) && segments.length > 1) {
        return `${segments[0]}/${segments[1]}`;
      }
    } catch {
      // Not a parseable URL. Fall through to the source-id-based fallback.
    }
  }

  // eslint-disable-next-line camelcase
  return `${server.source_id || 'catalog'}/${slugify(server.name)}`;
};

export const catalogToolToRegistryTool = (tool: McpTool): RegistryMCPTool => {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const param of tool.parameters ?? []) {
    properties[param.name] = {
      type: param.type,
      ...(param.description && { description: param.description }),
    };
    if (param.required) {
      required.push(param.name);
    }
  }

  return {
    name: tool.name,
    ...(tool.description && { description: tool.description }),
    // eslint-disable-next-line camelcase
    input_schema: {
      type: 'object',
      properties,
      ...(required.length > 0 && { required }),
    },
  };
};

export const getMcpServerLogoEndpoint = (serverId: string): string => {
  const path = `${BFF_HOST_PATH}/mcp_catalog/mcp_servers/${encodeURIComponent(serverId)}/logo`;
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
};

export const catalogToRegistryIcons = (server: McpServer): MCPIcon[] => {
  if (!server.logo) {
    return [];
  }
  if (server.logo.startsWith('data:')) {
    return [{ src: getMcpServerLogoEndpoint(server.id) }];
  }
  return [{ src: server.logo }];
};

export const catalogToServerJson = (
  server: McpServer,
  registryName: string,
  displayName: string,
  deploySpec?: MCPServerCR['spec'],
): Record<string, unknown> => {
  const remotes: Record<string, unknown>[] = [];
  if (server.endpoints?.http) {
    remotes.push({ type: 'streamable-http', url: server.endpoints.http });
  }
  if (server.endpoints?.sse) {
    remotes.push({ type: 'sse', url: server.endpoints.sse });
  }

  return {
    $schema: MCP_SERVER_JSON_SCHEMA,
    name: registryName,
    ...(server.description && { description: server.description }),
    ...(displayName && { title: displayName }),
    version: server.version || '1.0.0',
    ...(server.documentationUrl && { websiteUrl: server.documentationUrl }),
    ...(remotes.length > 0 && { remotes }),
    ...(deploySpec && { _meta: { [RHAI_DEPLOY_SPEC_META_KEY]: deploySpec } }),
  };
};
