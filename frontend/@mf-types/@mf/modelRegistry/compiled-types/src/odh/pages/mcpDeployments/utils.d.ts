import { McpDeployment, McpDeploymentPhase } from '~/odh/types/mcpDeploymentTypes';
export declare const getConnectionUrl: (deployment: McpDeployment) => string | undefined;
export declare const getDeploymentDisplayName: (deployment: McpDeployment) => string;
export type McpDeploymentStatusInfo = {
    label: string;
    status: 'success' | 'danger' | 'info';
    popoverBody: string;
};
export declare const getStatusInfo: (phase: McpDeploymentPhase) => McpDeploymentStatusInfo;
