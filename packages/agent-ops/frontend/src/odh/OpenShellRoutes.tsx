import * as React from 'react';
import { WorkspaceListPage } from 'openshell-dashboard/pages';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { agentOpsWorkspaceDetailPath } from '~/app/utilities/routes';

const OpenShellListRoute: React.FC = () => {
  const navigate = useNavigate();

  return (
    <WorkspaceListPage
      onSelect={(workspaceName) => navigate(agentOpsWorkspaceDetailPath(workspaceName))}
    />
  );
};

const OpenShellRoutes: React.FC = () => (
  <Routes>
    <Route index element={<OpenShellListRoute />} />
    <Route path="*" element={<Navigate to="." replace />} />
  </Routes>
);

export default OpenShellRoutes;
