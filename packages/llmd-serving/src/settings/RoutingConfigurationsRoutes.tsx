import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router';

const RoutingConfigurationsView = React.lazy(() => import('./RoutingConfigurationsView'));
const RoutingConfigurationCreateEdit = React.lazy(() => import('./RoutingConfigurationCreateEdit'));

const RoutingConfigurationsRoutes: React.FC = () => (
  <React.Suspense fallback={null}>
    <Routes>
      <Route index element={<RoutingConfigurationsView />} />
      <Route path="add" element={<RoutingConfigurationCreateEdit />} />
      <Route path="edit/:configName" element={<RoutingConfigurationCreateEdit />} />
      <Route path="*" element={<Navigate to="." />} />
    </Routes>
  </React.Suspense>
);

export default RoutingConfigurationsRoutes;
