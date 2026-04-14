import { McpDeployment, McpDeploymentPhase } from '~/app/mcpDeploymentTypes';

export const getConnectionUrl = (deployment: McpDeployment): string | undefined => {
  if (deployment.phase !== McpDeploymentPhase.RUNNING) {
    return undefined;
  }
  return deployment.address?.url;
};

export const getDeploymentDisplayName = (deployment: McpDeployment): string =>
  deployment.displayName || deployment.name;

export type McpDeploymentStatusInfo = {
  label: string;
  status: 'success' | 'danger' | 'info';
  popoverBody: string;
};

export const getStatusInfo = (phase: McpDeploymentPhase): McpDeploymentStatusInfo => {
  switch (phase) {
    case McpDeploymentPhase.RUNNING:
      return {
        label: 'Available',
        status: 'success',
        popoverBody: 'The pod and its containers are healthy and running.',
      };
    case McpDeploymentPhase.FAILED:
      return {
        label: 'Unavailable',
        status: 'danger',
        popoverBody: 'At least 1 container in the pod failed.',
      };
    case McpDeploymentPhase.PENDING:
      return {
        label: 'Pending',
        status: 'info',
        popoverBody: 'This MCP server is starting up and will be available shortly.',
      };
    default:
      return {
        label: 'Unknown',
        status: 'info',
        popoverBody: 'The status of this MCP server is unknown.',
      };
  }
};
