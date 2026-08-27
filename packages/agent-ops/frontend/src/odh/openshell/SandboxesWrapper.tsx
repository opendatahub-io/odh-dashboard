import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { SandboxListPage } from 'openshell-dashboard/pages';
import OpenShellProviders from './OpenShellProviders';
import WorkspaceSelector from './WorkspaceSelector';
import { useSelectedWorkspace } from './WorkspaceContext';

// The OpenShell landing: sandboxes are the content, scoped to the workspace
// chosen in the top-bar selector. No sub-tabs — core's TabRoutePage hides the
// tab bar when the module contributes a single tab.
const SandboxesContent: React.FC = () => {
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
    <SandboxListPage
      workspace={workspace}
      onSelect={(name) =>
        navigate(`/ai-hub/agents/workspaces/${workspace}/sandboxes/${name}`)
      }
      onViewSandbox={(name, tab) => {
        const tabParam = tab ? `?tab=${tab}` : '';
        navigate(
          `/ai-hub/agents/workspaces/${workspace}/sandboxes/${name}${tabParam}`,
        );
      }}
    />
  );
};

const SandboxesWrapper: React.FC = () => (
  <OpenShellProviders toolbarStart={<WorkspaceSelector />}>
    <SandboxesContent />
  </OpenShellProviders>
);

export default SandboxesWrapper;
