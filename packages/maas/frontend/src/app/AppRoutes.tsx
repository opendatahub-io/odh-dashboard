import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import NotFound from '@odh-dashboard/internal/pages/NotFound';
// Tiers UI disabled - API being removed in next release
// import AllTiersPage from '~/app/pages/tiers/AllTiersPage';
// import ViewTierPage from '~/app/pages/tiers/ViewTierPage';
// import EditTierPage from '~/app/pages/tiers/EditTierPage';
// import CreateTierPage from '~/app/pages/tiers/CreateTierPage';
import AllApiKeysPage from '~/app/pages/api-keys/AllApiKeysPage';

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<AllApiKeysPage />} />
    {/* Tiers UI disabled - API being removed in next release */}
    {/* <Route path="/" element={<AllTiersPage />} /> */}
    {/* <Route path="/create" element={<CreateTierPage />} /> */}
    {/* <Route path="/view/:tierName" element={<ViewTierPage />} /> */}
    {/* <Route path="/edit/:tierName" element={<EditTierPage />} /> */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
