export const agentOpsRootPath = '/ai-hub/agents';

export const globAgentOpsAll = `${agentOpsRootPath}/*`;

export const agentDeploymentsPath = `${agentOpsRootPath}/deployments`;

export const agentOpsDeploymentsRoute = (namespace?: string): string =>
  !namespace ? agentDeploymentsPath : `${agentDeploymentsPath}/${encodeURIComponent(namespace)}`;

export const agentOpsDeploymentDetailRoute = (namespace: string, agentId: string): string =>
  `${agentDeploymentsPath}/${encodeURIComponent(namespace)}/${encodeURIComponent(agentId)}`;
