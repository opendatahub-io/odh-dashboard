import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ClusterSettingsPage from './ClusterSettingsPage';

const ClusterSettingsRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<ClusterSettingsPage />} />
    <Route path="*" element={<Navigate to="." />} />
  </Routes>
);

export default ClusterSettingsRoutes;
