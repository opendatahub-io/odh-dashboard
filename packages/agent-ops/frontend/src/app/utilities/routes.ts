export const agentOpsRootPath = '/ai-hub/agents';

export const globAgentOpsAll = `${agentOpsRootPath}/*`;

export const agentDeploymentsPath = `${agentOpsRootPath}/deployments`;

export const agentDeployWizardPath = `${agentDeploymentsPath}/deploy`;

/** Paths registered as full-page app.route breakouts (outside the Agents tab layout). */
export const agentOpsStandaloneRoutePaths = [
  agentDeployWizardPath,
  `${agentDeploymentsPath}/:namespace/:agentId/*`,
] as const;

export const getAgentDeployWizardRoute = (): string => agentDeployWizardPath;

export const agentOpsDeploymentsRoute = (namespace?: string): string =>
  !namespace ? agentDeploymentsPath : `${agentDeploymentsPath}/${encodeURIComponent(namespace)}`;

export const agentOpsDeploymentDetailRoute = (namespace: string, agentId: string): string =>
  `${agentDeploymentsPath}/${encodeURIComponent(namespace)}/${encodeURIComponent(agentId)}`;

/** Guards in-app navigation targets passed via location.state. */
export const isSafeAgentOpsInternalRoute = (path: unknown): boolean => {
  if (typeof path !== 'string') {
    return false;
  }

  if (
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('://') ||
    path.includes('..') ||
    path.includes('\\')
  ) {
    return false;
  }

  try {
    const { pathname } = new URL(path, 'http://localhost');
    return pathname === agentOpsRootPath || pathname.startsWith(`${agentOpsRootPath}/`);
  } catch {
    return false;
  }
};

export const sanitizeAgentOpsReturnRoute = (
  path: string | undefined,
  fallbackNamespace: string,
): string =>
  path && isSafeAgentOpsInternalRoute(path) ? path : agentOpsDeploymentsRoute(fallbackNamespace);
