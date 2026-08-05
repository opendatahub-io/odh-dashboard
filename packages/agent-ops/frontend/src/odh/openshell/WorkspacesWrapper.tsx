import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkspaceListPage } from 'openshell-dashboard/pages';
import OpenShellProviders from './OpenShellProviders';

const WorkspacesWrapper: React.FC = () => {
  const navigate = useNavigate();
  return (
    <OpenShellProviders>
      <WorkspaceListPage
        onSelect={(name) => navigate(`/ai-hub/agents/workspaces/${name}`)}
      />
    </OpenShellProviders>
  );
};

export default WorkspacesWrapper;
