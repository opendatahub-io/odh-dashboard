export const agentsRootPath = '/ai-hub/agents';
export const agentDeploymentsPath = `${agentsRootPath}/deployments`;
export const openShellProviderPath = `${agentDeploymentsPath}/providers/openshell`;
export const nativeProviderPath = `${agentDeploymentsPath}/providers/native`;
export const nativeProviderProjectPathPattern = `${nativeProviderPath}/projects/:namespace`;
export const nativeProviderSandboxPathPattern = `${nativeProviderProjectPathPattern}/sandboxes/:agentId/*`;
export const nativeProviderCreatePathPattern = `${nativeProviderProjectPathPattern}/create`;

export const openShellSandboxRoute = (workspace: string, sandbox: string, tab?: string): string =>
  `${openShellProviderPath}/workspaces/${encodeURIComponent(workspace)}/sandboxes/${encodeURIComponent(
    sandbox,
  )}${tab ? `?tab=${encodeURIComponent(tab)}` : ''}`;

export const agentOpsDeploymentsRoute = (namespace?: string): string =>
  !namespace
    ? nativeProviderPath
    : `${nativeProviderPath}/projects/${encodeURIComponent(namespace)}`;

export const agentOpsDeploymentDetailRoute = (namespace: string, agentId: string): string =>
  `${agentOpsDeploymentsRoute(namespace)}/sandboxes/${encodeURIComponent(agentId)}`;

export const getAgentDeployWizardRoute = (namespace: string): string =>
  `${agentOpsDeploymentsRoute(namespace)}/create`;

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
    path.includes('\\') ||
    /[\t\n\r]/.test(path)
  ) {
    return false;
  }

  try {
    const { pathname } = new URL(path, 'http://localhost');
    return pathname === nativeProviderPath || pathname.startsWith(`${nativeProviderPath}/`);
  } catch {
    return false;
  }
};

export const sanitizeAgentOpsReturnRoute = (
  path: string | undefined,
  fallbackNamespace: string,
): string =>
  path && isSafeAgentOpsInternalRoute(path) ? path : agentOpsDeploymentsRoute(fallbackNamespace);
