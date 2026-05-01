import { McpDeployment, McpDeploymentPhase } from '~/app/mcpDeploymentTypes';
export declare const getConnectionUrl: (deployment: McpDeployment) => string | undefined;
export declare const getDeploymentDisplayName: (deployment: McpDeployment) => string;
export type McpDeploymentStatusInfo = {
    label: string;
    status: 'success' | 'danger' | 'info';
    tooltip: string;
};
export declare const getStatusInfo: (phase: McpDeploymentPhase) => McpDeploymentStatusInfo;
