import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { SandboxListPage } from 'openshell-dashboard/pages';
import { useWorkspaces } from 'openshell-dashboard/api';
import OpenShellProviders from './OpenShellProviders';

const SandboxesContent: React.FC = () => {
  const navigate = useNavigate();
  const workspaces = useWorkspaces();
  const workspace = workspaces.data?.[0]?.metadata?.name ?? 'default';

  if (workspaces.isLoading) {
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
  <OpenShellProviders>
    <SandboxesContent />
  </OpenShellProviders>
);

export default SandboxesWrapper;
