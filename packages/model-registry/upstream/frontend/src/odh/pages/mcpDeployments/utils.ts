import type { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import {
  McpDeployment,
  McpDeploymentCondition,
  McpConditionType,
  McpConditionStatus,
  McpReadyReason,
} from '~/odh/types/mcpDeploymentTypes';

/** Adapts a McpDeployment to the minimal shape ResourceNameTooltip needs. */
export const convertMcpDeploymentToK8sResource = (
  deployment: McpDeployment,
): K8sResourceCommon => ({
  apiVersion: 'mcp.x-k8s.io/v1alpha1',
  kind: 'MCPServer',
  metadata: { name: deployment.name },
});

export const getCondition = (
  conditions: McpDeploymentCondition[],
  type: McpConditionType,
): McpDeploymentCondition | undefined => conditions.find((c) => c.type === type);

export const isConditionTrue = (condition: McpDeploymentCondition | undefined): boolean =>
  condition?.status === McpConditionStatus.TRUE;

/**
 * Gateway registration is reconciled asynchronously. RHCL can briefly report
 * that a server is not present in the Gateway before the registration becomes
 * Ready. Treat the known in-progress reasons/messages as pending; reserve a
 * failure state for an explicit registration error.
 */
export const isGatewayRegistrationPending = (
  condition: McpDeploymentCondition | undefined,
): boolean => {
  if (!condition || condition.type !== McpConditionType.GATEWAY_REGISTRATION) {
    return false;
  }
  if (condition.status !== McpConditionStatus.FALSE) {
    return false;
  }

  const pendingReasons = new Set([
    'Pending',
    'NotFound',
    'NotRegistered',
    'Initializing',
    'Progressing',
    'Reconciling',
    'Waiting',
  ]);
  if (condition.reason && pendingReasons.has(condition.reason)) {
    return true;
  }

  return /not present in gateway|waiting for gateway|gateway registration.*(pending|ready)|reconcil/i.test(
    condition.message || '',
  );
};

export const getConnectionUrl = (deployment: McpDeployment): string | undefined => {
  const { conditions, address } = deployment;
  const ready = getCondition(conditions, McpConditionType.READY);
  if (!isConditionTrue(ready)) {
    return undefined;
  }
  return address?.url;
};

export const isClusterLocalConnectionUrl = (url: string): boolean => {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname.endsWith('.svc') || hostname.includes('.svc.');
  } catch {
    return url.includes('.svc.');
  }
};

export const getDeploymentDisplayName = (deployment: McpDeployment): string =>
  deployment.displayName || deployment.name;

/** Sort/filter key for the "MCP server" column. */
export const getMcpServerSortKey = (deployment: McpDeployment): string =>
  deployment.registryServerDisplayName || deployment.registryServer || deployment.serverName || '';

/** Sort key for the "Registered version" column. */
export const getRegisteredVersionSortKey = (deployment: McpDeployment): string =>
  deployment.registryServer ? deployment.registryVersion || '' : '';

export type McpDeploymentStatusInfo = {
  label: string;
  status: 'success' | 'danger' | 'warning' | 'info';
  popoverBody: string;
};

export const getStatusInfo = (conditions: McpDeploymentCondition[]): McpDeploymentStatusInfo => {
  const accepted = getCondition(conditions, McpConditionType.ACCEPTED);
  const ready = getCondition(conditions, McpConditionType.READY);
  const gatewayRegistration = getCondition(conditions, McpConditionType.GATEWAY_REGISTRATION);

  if (accepted && !isConditionTrue(accepted)) {
    return {
      label: 'Configuration invalid',
      status: 'danger',
      popoverBody: accepted.message || 'The server configuration is invalid.',
    };
  }

  if (ready?.reason === McpReadyReason.SCALED_TO_ZERO) {
    return {
      label: 'Scaled to zero',
      status: 'info',
      popoverBody: ready.message || 'This MCP server has been scaled to zero replicas.',
    };
  }

  if (
    ready &&
    isConditionTrue(ready) &&
    gatewayRegistration &&
    !isConditionTrue(gatewayRegistration)
  ) {
    const registrationFailed =
      gatewayRegistration.status === McpConditionStatus.FALSE &&
      !isGatewayRegistrationPending(gatewayRegistration);
    return {
      label: registrationFailed ? 'Gateway registration failed' : 'Registering with Gateway',
      status: registrationFailed ? 'danger' : 'info',
      popoverBody:
        gatewayRegistration.message ||
        (registrationFailed
          ? 'The MCP server is ready, but its Gateway registration failed.'
          : 'The MCP server is ready and is waiting for Gateway registration to complete.'),
    };
  }

  if (ready && isConditionTrue(ready)) {
    return {
      label: 'Available',
      status: 'success',
      popoverBody: ready.message || 'The MCP server is ready and serving requests.',
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
