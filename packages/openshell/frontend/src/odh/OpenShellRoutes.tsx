import * as React from 'react';
import { WorkspaceListPage } from 'openshell-dashboard/pages';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { openshellWorkspaceDetailPath } from '~/app/utilities/routes';

const WorkspacesListRoute: React.FC = () => {
  const navigate = useNavigate();

  return (
    <WorkspaceListPage
      onSelect={(workspaceName) => navigate(openshellWorkspaceDetailPath(workspaceName))}
    />
  );
};

const OpenShellRoutes: React.FC = () => (
  <Routes>
    <Route index element={<WorkspacesListRoute />} />
    <Route path="*" element={<Navigate to="." replace />} />
  </Routes>
);

export default OpenShellRoutes;
