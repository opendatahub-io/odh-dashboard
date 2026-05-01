import { APIOptions } from 'mod-arch-core';
import { MCPServerCR, McpDeployment, McpDeploymentCreateRequest, McpDeploymentUpdateRequest } from '~/app/mcpDeploymentTypes';
export type McpServerAvailabilityResponse = {
    available: boolean;
};
export declare const getMcpServerAvailability: (hostPath: string) => (opts: APIOptions) => Promise<McpServerAvailabilityResponse>;
export declare const getMcpServerConverter: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, serverId: string) => Promise<MCPServerCR>;
export declare const createMcpDeployment: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, data: McpDeploymentCreateRequest) => Promise<McpDeployment>;
export declare const updateMcpDeployment: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, deploymentName: string, data: McpDeploymentUpdateRequest) => Promise<McpDeployment>;
