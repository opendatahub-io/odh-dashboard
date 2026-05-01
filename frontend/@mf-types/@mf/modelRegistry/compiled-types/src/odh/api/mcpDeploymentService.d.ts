import { APIOptions } from 'mod-arch-core';
import { McpDeploymentList } from '~/odh/types/mcpDeploymentTypes';
export declare const deleteMcpDeployment: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, name: string) => Promise<void>;
export declare const getListMcpDeployments: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions) => Promise<McpDeploymentList>;
