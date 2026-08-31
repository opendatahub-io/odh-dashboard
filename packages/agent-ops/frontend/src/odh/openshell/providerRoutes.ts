export const DEPLOYMENTS_PATH = '/ai-hub/agents/openshell';
export const OPENSHELL_PROVIDER_PATH = `${DEPLOYMENTS_PATH}/provider/openshell`;
export const NATIVE_PROVIDER_PATH = `${DEPLOYMENTS_PATH}/provider/native`;

export const nativeSandboxPath = (namespace?: string): string =>
  namespace ? `${NATIVE_PROVIDER_PATH}/${encodeURIComponent(namespace)}` : NATIVE_PROVIDER_PATH;

export const openShellSandboxPath = (workspace: string, sandbox: string, tab?: string): string =>
  `${OPENSHELL_PROVIDER_PATH}/workspaces/${workspace}/sandboxes/${sandbox}${
    tab ? `?tab=${tab}` : ''
  }`;
