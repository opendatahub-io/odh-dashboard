import {
  McpDeployment,
  McpDeploymentCondition,
  McpConditionType,
  McpConditionStatus,
  McpReadyReason,
} from '~/app/mcpDeploymentTypes';

export const getCondition = (
  conditions: McpDeploymentCondition[],
  type: McpConditionType,
): McpDeploymentCondition | undefined => conditions.find((c) => c.type === type);

export const isConditionTrue = (condition: McpDeploymentCondition | undefined): boolean =>
  condition?.status === McpConditionStatus.TRUE;

export const getConnectionUrl = (deployment: McpDeployment): string | undefined => {
  const ready = getCondition(deployment.conditions, McpConditionType.READY);
  if (!isConditionTrue(ready)) {
    return undefined;
  }
  return deployment.address?.url;
};

export const getDeploymentDisplayName = (deployment: McpDeployment): string =>
  deployment.displayName || deployment.name;

export type McpDeploymentStatusInfo = {
  label: string;
  status: 'success' | 'danger' | 'warning' | 'info';
  popoverBody: string;
};

export const getStatusInfo = (conditions: McpDeploymentCondition[]): McpDeploymentStatusInfo => {
  const accepted = getCondition(conditions, McpConditionType.ACCEPTED);
  const ready = getCondition(conditions, McpConditionType.READY);

  if (accepted && !isConditionTrue(accepted)) {
    return {
      label: 'Configuration invalid',
      status: 'danger',
      popoverBody: accepted.message || 'The server configuration is invalid.',
    };
  }

  if (isConditionTrue(ready)) {
    return {
      label: 'Available',
      status: 'success',
      popoverBody: 'The MCP server is ready and serving requests.',
    };
  }

  if (ready) {
    switch (ready.reason) {
      case McpReadyReason.INITIALIZING:
        return {
          label: 'Initializing',
          status: 'info',
          popoverBody:
            ready.message || 'This MCP server is starting up and will be available shortly.',
        };
      case McpReadyReason.SCALED_TO_ZERO:
        return {
          label: 'Scaled to zero',
          status: 'info',
          popoverBody: ready.message || 'This MCP server has been scaled to zero replicas.',
        };
      case McpReadyReason.CONFIGURATION_INVALID:
        return {
          label: 'Configuration invalid',
          status: 'danger',
          popoverBody: ready.message || 'The server configuration is invalid.',
        };
      case McpReadyReason.DEPLOYMENT_UNAVAILABLE:
        return {
          label: 'Unavailable',
          status: 'danger',
          popoverBody: ready.message || 'The server deployment is unavailable.',
        };
      default:
        return {
          label: 'Not ready',
          status: 'warning',
          popoverBody: ready.message || 'The MCP server is not ready.',
        };
    }
  }

  if (conditions.length === 0) {
    return {
      label: 'Pending',
      status: 'info',
      popoverBody: 'This MCP server is starting up and will be available shortly.',
    };
  }

  return {
    label: 'Unknown',
    status: 'info',
    popoverBody: 'The status of this MCP server is unknown.',
  };
};

const STATUS_SORT_WEIGHTS: Record<McpDeploymentStatusInfo['status'], number> = {
  danger: 0,
  warning: 1,
  info: 2,
  success: 3,
};

export const getStatusSortWeight = (conditions: McpDeploymentCondition[]): number =>
  STATUS_SORT_WEIGHTS[getStatusInfo(conditions).status];
