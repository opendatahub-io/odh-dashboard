import * as React from 'react';
import { useWorkspaces } from 'openshell-dashboard/api';
import { useOpenShellConnection } from './OpenShellConnection';

// A workspace is OpenShell's tenancy/isolation boundary (its "namespace"): it
// scopes sandboxes, providers, policies and members. In the RHOAI embed it is
// modeled as a *selector* (like the project/namespace picker) rather than a
// destination — the selected workspace scopes the sandboxes list, and full
// workspace management is reached via "Go to workspace".

type WorkspaceSummary = { metadata?: { name?: string } };

type SelectedWorkspaceContextValue = {
  workspace: string;
  setWorkspace: (name: string) => void;
  workspaces: WorkspaceSummary[];
  isLoading: boolean;
};

const DEFAULT_WORKSPACE = 'default';
const DISCONNECTED_WORKSPACE_VALUE: SelectedWorkspaceContextValue = {
  workspace: DEFAULT_WORKSPACE,
  setWorkspace: () => undefined,
  workspaces: [],
  isLoading: false,
};

const SelectedWorkspaceContext = React.createContext<SelectedWorkspaceContextValue>(
  DISCONNECTED_WORKSPACE_VALUE,
);

export const useSelectedWorkspace = (): SelectedWorkspaceContextValue =>
  React.useContext(SelectedWorkspaceContext);

// Fetches workspaces only once connected, so the query isn't fired (and cached
// as a 401) before Token B exists.
const ConnectedWorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const query = useWorkspaces();
  const workspaces = React.useMemo<WorkspaceSummary[]>(() => query.data ?? [], [query.data]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const resolved = selected ?? workspaces[0]?.metadata?.name ?? DEFAULT_WORKSPACE;

  const value = React.useMemo<SelectedWorkspaceContextValue>(
    () => ({
      workspace: resolved,
      setWorkspace: setSelected,
      workspaces,
      isLoading: query.isLoading,
    }),
    [resolved, workspaces, query.isLoading],
  );

  return (
    <SelectedWorkspaceContext.Provider value={value}>{children}</SelectedWorkspaceContext.Provider>
  );
};

export const SelectedWorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { state } = useOpenShellConnection();
  if (state.status !== 'connected') {
    return (
      <SelectedWorkspaceContext.Provider value={DISCONNECTED_WORKSPACE_VALUE}>
        {children}
      </SelectedWorkspaceContext.Provider>
    );
  }
  return <ConnectedWorkspaceProvider>{children}</ConnectedWorkspaceProvider>;
};
