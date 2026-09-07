const OPENSHELL_BASE = '/ai-hub/openshell';

export const openshellWorkspacesPath = `${OPENSHELL_BASE}/workspaces`;

export const openshellWorkspaceDetailPath = (workspaceId: string): string =>
  `${openshellWorkspacesPath}/${encodeURIComponent(workspaceId)}`;

export const openshellSandboxDetailPath = (workspaceId: string, sandboxName: string): string =>
  `${openshellWorkspacesPath}/${encodeURIComponent(workspaceId)}/sandboxes/${encodeURIComponent(sandboxName)}`;
