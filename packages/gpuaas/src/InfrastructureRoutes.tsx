import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import InfrastructurePage from './pages/InfrastructurePage';

const InfrastructureRoutes: React.FC = () => (
  <Routes>
    <Route index element={<InfrastructurePage />} />
    <Route path="*" element={<Navigate to="." replace />} />
  </Routes>
);

export default InfrastructureRoutes;
