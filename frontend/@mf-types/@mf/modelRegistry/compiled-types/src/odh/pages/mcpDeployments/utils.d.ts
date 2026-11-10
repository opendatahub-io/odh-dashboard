import type { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import { McpDeployment, McpDeploymentCondition, McpConditionType } from '~/odh/types/mcpDeploymentTypes';
/** Adapts a McpDeployment to the minimal shape ResourceNameTooltip needs. */
export declare const convertMcpDeploymentToK8sResource: (deployment: McpDeployment) => K8sResourceCommon;
export declare const getCondition: (conditions: McpDeploymentCondition[], type: McpConditionType) => McpDeploymentCondition | undefined;
export declare const isConditionTrue: (condition: McpDeploymentCondition | undefined) => boolean;
export declare const getConnectionUrl: (deployment: McpDeployment) => string | undefined;
export declare const getDeploymentDisplayName: (deployment: McpDeployment) => string;
/** Sort/filter key for the "MCP server" column. */
export declare const getMcpServerSortKey: (deployment: McpDeployment) => string;
/** Sort key for the "Registered version" column. */
export declare const getRegisteredVersionSortKey: (deployment: McpDeployment) => string;
export type McpDeploymentStatusInfo = {
    label: string;
    status: 'success' | 'danger' | 'warning' | 'info';
    popoverBody: string;
};
export declare const getStatusInfo: (conditions: McpDeploymentCondition[]) => McpDeploymentStatusInfo;
export declare const getStatusSortWeight: (conditions: McpDeploymentCondition[]) => number;
