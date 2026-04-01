import { McpDeployment, McpDeploymentPhase } from '~/app/mcpDeploymentTypes';

export const getConnectionUrl = (deployment: McpDeployment): string | undefined => {
  if (deployment.address?.url) {
    return deployment.address.url;
  }
  if (deployment.phase === McpDeploymentPhase.RUNNING) {
    return `${deployment.name}:${deployment.port}`;
  }
  return undefined;
};

export const getServerDisplayName = (deployment: McpDeployment): string => {
  const { image } = deployment;
  const lastSlash = image.lastIndexOf('/');
  const imageWithTag = lastSlash >= 0 ? image.substring(lastSlash + 1) : image;
  const [imageName, tag] = imageWithTag.split(':');

  const capitalizedName = imageName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');

  return tag ? `${capitalizedName}-${tag}` : capitalizedName;
};

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
