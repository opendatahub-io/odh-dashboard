import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import InfrastructurePage from './pages/InfrastructurePage';

const infrastructureRootPath = '/observe-and-monitor/infrastructure';

const InfrastructureRoutes: React.FC = () => (
  <Routes>
    <Route index element={<InfrastructurePage />} />
    <Route path="*" element={<Navigate to={infrastructureRootPath} replace />} />
  </Routes>
);

export default InfrastructureRoutes;
