export const agentOpsRootPath = '/ai-hub/agents';

export const globAgentOpsAll = `${agentOpsRootPath}/*`;

export const agentDeploymentsPath = `${agentOpsRootPath}/deployments`;

export const agentOpsDeploymentsRoute = (namespace?: string): string =>
  !namespace ? agentDeploymentsPath : `${agentDeploymentsPath}/${namespace}`;

export const agentOpsDeploymentDetailRoute = (namespace: string, agentId: string): string =>
  `${agentOpsDeploymentsRoute(namespace)}/${encodeURIComponent(agentId)}`;
