import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import McpDeploymentsPage from './McpDeploymentsPage';

const McpDeploymentsRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<McpDeploymentsPage />} />
    <Route path="*" element={<Navigate to="." />} />
  </Routes>
);

export default McpDeploymentsRoutes;
