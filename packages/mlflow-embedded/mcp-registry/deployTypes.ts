// Field names mirror the mlflow BFF's MCP Registry API (snake_case).
/* eslint-disable camelcase */
import { MCPTransportType } from './types';

export type McpRegistryDeployData = {
  registryServer: string;
  registryVersion: string;
  displayName: string;
  namespace: string; // Fixed to the MCP Registry's project
  image: string; // From _meta['com.redhat/deploy-spec'].source.containerImage.ref; may be empty
  yaml: string; // From _meta['com.redhat/deploy-spec'].config/runtime, re-serialized; may be empty
  transportType: MCPTransportType; // streamable-http or sse
};

export type CreateMcpAccessEndpointRequest = {
  endpoint_url: string;
  transport_type?: MCPTransportType;
  server_version?: string;
  server_alias?: string; // Never sent; mutually exclusive with server_version
};

export type McpAccessEndpoint = {
  id: string;
  server_name: string;
  endpoint_url: string;
  transport_type: MCPTransportType;
};
