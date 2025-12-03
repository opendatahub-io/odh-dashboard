import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import AllTiersPage from '~/app/pages/tiers/AllTiersPage';
import ViewTierPage from '~/app/pages/tiers/ViewTierPage';
import EditTierPage from '~/app/pages/tiers/EditTierPage';
import CreateTierPage from '~/app/pages/tiers/CreateTierPage';

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/maas/tiers" replace />} />
    <Route path="/tiers" element={<AllTiersPage />} />
    <Route path="/tiers/create" element={<CreateTierPage />} />
    <Route path="/tiers/:tierName" element={<ViewTierPage />} />
    <Route path="/tiers/:tierName/edit" element={<EditTierPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
