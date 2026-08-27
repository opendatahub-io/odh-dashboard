import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { WorkspaceDetailPage } from 'openshell-dashboard/pages';
import OpenShellProviders from './OpenShellProviders';
import WorkspaceSelector from './WorkspaceSelector';
import { useSelectedWorkspace } from './WorkspaceContext';

// The OpenShell landing IS the workspace page for the workspace chosen in the
// top-bar selector — its own Sandboxes / Providers / Members / Inference tabs.
// No separate sandbox list, no module sub-tabs (core hides the tab bar in
// single-tab mode).
const WorkspaceLandingContent: React.FC = () => {
  const navigate = useNavigate();
  const { workspace, isLoading } = useSelectedWorkspace();

  if (isLoading) {
    return (
      <Bullseye>
        <Spinner aria-label="Loading workspaces" />
      </Bullseye>
    );
  }

  return (
    <WorkspaceDetailPage
      workspace={workspace}
      onSelectSandbox={(name) =>
        navigate(`/ai-hub/agents/workspaces/${workspace}/sandboxes/${name}`)
      }
      onSelectProvider={(name) =>
        navigate(`/ai-hub/agents/workspaces/${workspace}/providers/${name}`)
      }
    />
  );
};

const SandboxesWrapper: React.FC = () => (
  <OpenShellProviders toolbarStart={<WorkspaceSelector />}>
    <WorkspaceLandingContent />
  </OpenShellProviders>
);

export default SandboxesWrapper;
