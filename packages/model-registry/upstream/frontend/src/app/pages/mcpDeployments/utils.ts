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
  tooltip: string;
};

export const getStatusInfo = (phase: McpDeploymentPhase): McpDeploymentStatusInfo => {
  switch (phase) {
    case McpDeploymentPhase.RUNNING:
      return {
        label: 'Available',
        status: 'success',
        tooltip: 'This MCP server is running and available for connections.',
      };
    case McpDeploymentPhase.FAILED:
      return {
        label: 'Unavailable',
        status: 'danger',
        tooltip: 'This MCP server has failed and is not available.',
      };
    case McpDeploymentPhase.PENDING:
      return {
        label: 'Pending',
        status: 'info',
        tooltip: 'This MCP server is starting up and will be available shortly.',
      };
    default:
      return {
        label: 'Unknown',
        status: 'info',
        tooltip: 'The status of this MCP server is unknown.',
      };
  }
};
