import * as React from 'react';
import { SandboxDetailPage, WorkspaceDetailPage } from 'openshell-dashboard/pages';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  agentOpsSandboxDetailPath,
  agentOpsWorkspaceDetailPath,
  agentOpsWorkspacesPath,
} from '~/app/utilities/routes';
import WorkspacesFederatedProviders from './WorkspacesFederatedProviders';

const WorkspaceDetailRoute: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  if (!workspaceId) {
    return <Navigate to={agentOpsWorkspacesPath} replace />;
  }

  return (
    <WorkspaceDetailPage
      workspace={workspaceId}
      onSelectSandbox={(sandboxName) =>
        navigate(agentOpsSandboxDetailPath(workspaceId, sandboxName))
      }
      onViewSandbox={(sandboxName, tab) => {
        const path = agentOpsSandboxDetailPath(workspaceId, sandboxName);
        navigate(tab ? `${path}?tab=${encodeURIComponent(tab)}` : path);
      }}
    />
  );
};

const SandboxDetailRoute: React.FC = () => {
  const { workspaceId, sandboxName } = useParams<{ workspaceId: string; sandboxName: string }>();

  if (!workspaceId) {
    return <Navigate to={agentOpsWorkspacesPath} replace />;
  }

  if (!sandboxName) {
    return <Navigate to={agentOpsWorkspaceDetailPath(workspaceId)} replace />;
  }

  return <SandboxDetailPage workspace={workspaceId} sandboxName={sandboxName} />;
};

const WorkspacesDetailRoutes: React.FC = () => (
  <WorkspacesFederatedProviders>
    <Routes>
      <Route path="sandboxes/:sandboxName/*" element={<SandboxDetailRoute />} />
      <Route path="*" element={<WorkspaceDetailRoute />} />
    </Routes>
  </WorkspacesFederatedProviders>
);

export default WorkspacesDetailRoutes;
