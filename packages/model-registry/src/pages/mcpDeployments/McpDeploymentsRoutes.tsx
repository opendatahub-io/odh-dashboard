import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import McpDeploymentsPage from './McpDeploymentsPage';
import McpDeploymentsCoreLoader from '../../odh/McpDeploymentsCoreLoader';
import { mcpDeploymentsUrl } from '../../../upstream/frontend/src/app/routes/mcpCatalog/mcpCatalog';

const McpDeploymentsRoutes: React.FC = () => (
  <Routes>
    <Route element={<McpDeploymentsCoreLoader getInvalidRedirectPath={mcpDeploymentsUrl} />}>
      <Route path="/:namespace" element={<McpDeploymentsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="." />} />
  </Routes>
);

export default McpDeploymentsRoutes;
