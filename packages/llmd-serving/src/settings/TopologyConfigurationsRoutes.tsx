import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router';

const TopologyConfigurationsView = React.lazy(() => import('./TopologyConfigurationsView'));
const TopologyConfigurationCreateEdit = React.lazy(
  () => import('./TopologyConfigurationCreateEdit'),
);

const TopologyConfigurationsRoutes: React.FC = () => (
  <React.Suspense fallback={null}>
    <Routes>
      <Route index element={<TopologyConfigurationsView />} />
      <Route path="add/:topologyType" element={<TopologyConfigurationCreateEdit />} />
      <Route path="edit/:configName" element={<TopologyConfigurationCreateEdit />} />
      <Route path="*" element={<Navigate to="." />} />
    </Routes>
  </React.Suspense>
);

export default TopologyConfigurationsRoutes;
