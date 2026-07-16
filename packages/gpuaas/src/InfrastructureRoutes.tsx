import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import InfrastructurePage from './pages/InfrastructurePage';

/** Must match `href` / route base in `extensions.ts`. */
export const INFRASTRUCTURE_PATH = '/observe-and-monitor/infrastructure';

const InfrastructureRoutes: React.FC = () => (
  <Routes>
    <Route index element={<InfrastructurePage />} />
    <Route path="*" element={<Navigate to=".." relative="path" replace />} />
  </Routes>
);

export default InfrastructureRoutes;
