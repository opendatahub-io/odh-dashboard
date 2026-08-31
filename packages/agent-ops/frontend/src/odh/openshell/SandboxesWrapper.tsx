import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bullseye, Divider, Flex, FlexItem, PageSection, Spinner } from '@patternfly/react-core';
import { SandboxListPage } from 'openshell-dashboard/pages';
import { OpenShellConnectGate } from './OpenShellConnection';
import OpenShellProviders from './OpenShellProviders';
import ProviderHeader from './ProviderHeader';
import WorkspaceSelector from './WorkspaceSelector';
import { useSelectedWorkspace } from './WorkspaceContext';
import { openShellSandboxPath } from './providerRoutes';

// The OpenShell provider page is a workspace-scoped sandbox view. Workspace is
// a scope selector in the table toolbar, not a destination with its own title,
// status, or resource tabs.
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
    <SandboxListPage
      workspace={workspace}
      createActionPosition="end"
      compactToolbar
      toolbarStart={
        <Flex alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <WorkspaceSelector />
          </FlexItem>
        </Flex>
      }
      onSelect={(name) => navigate(openShellSandboxPath(workspace, name))}
      onViewSandbox={(name, tab) => navigate(openShellSandboxPath(workspace, name, tab))}
    />
  );
};

const SandboxesWrapper: React.FC = () => (
  <OpenShellProviders requireConnection={false}>
    <ProviderHeader />
    <OpenShellConnectGate>
      <PageSection hasBodyWrapper={false} className="pf-v6-u-pt-0">
        <Divider />
        <WorkspaceLandingContent />
      </PageSection>
    </OpenShellConnectGate>
  </OpenShellProviders>
);

export default SandboxesWrapper;
