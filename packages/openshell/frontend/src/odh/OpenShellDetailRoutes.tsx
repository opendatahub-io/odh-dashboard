import * as React from 'react';
import { SandboxDetailPage, WorkspaceDetailPage } from 'openshell-dashboard/pages';
import { Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { openshellSandboxDetailPath } from '~/app/utilities/routes';
import OpenShellFederatedProviders from './OpenShellFederatedProviders';

const WorkspaceDetailRoute: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  if (!workspaceId) {
    return null;
  }

  return (
    <WorkspaceDetailPage
      workspace={workspaceId}
      onSelectSandbox={(sandboxName) =>
        navigate(openshellSandboxDetailPath(workspaceId, sandboxName))
      }
    />
  );
};

const SandboxDetailRoute: React.FC = () => {
  const { workspaceId, sandboxName } = useParams<{ workspaceId: string; sandboxName: string }>();

  if (!workspaceId || !sandboxName) {
    return null;
  }

  return <SandboxDetailPage workspace={workspaceId} sandboxName={sandboxName} />;
};

const OpenShellDetailRoutes: React.FC = () => (
  <OpenShellFederatedProviders>
    <Routes>
      <Route path="sandboxes/:sandboxName/*" element={<SandboxDetailRoute />} />
      <Route path="*" element={<WorkspaceDetailRoute />} />
    </Routes>
  </OpenShellFederatedProviders>
);

export default OpenShellDetailRoutes;
