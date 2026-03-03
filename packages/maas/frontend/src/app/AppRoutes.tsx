import * as React from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import AllTiersPage from '~/app/pages/tiers/AllTiersPage';
import ViewTierPage from '~/app/pages/tiers/ViewTierPage';
import EditTierPage from '~/app/pages/tiers/EditTierPage';
import CreateTierPage from '~/app/pages/tiers/CreateTierPage';
import AllApiKeysPage from '~/app/pages/api-keys/AllApiKeysPage';

const AppRoutes: React.FC = () => {
  const location = useLocation();
  const isTokensRoute = location.pathname.startsWith('/maas/tokens');

  return (
    <Routes>
      {isTokensRoute ? (
        <>
          <Route path="/" element={<AllApiKeysPage />} />
        </>
      ) : (
        <>
          <Route path="/" element={<AllTiersPage />} />
          <Route path="/create" element={<CreateTierPage />} />
          <Route path="/view/:tierName" element={<ViewTierPage />} />
          <Route path="/edit/:tierName" element={<EditTierPage />} />
        </>
      )}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
