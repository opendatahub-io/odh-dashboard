import * as React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import AllTiersPage from '~/app/pages/tiers/AllTiersPage';
import ViewTierPage from '~/app/pages/tiers/ViewTierPage';
import EditTierPage from '~/app/pages/tiers/EditTierPage';
import CreateTierPage from '~/app/pages/tiers/CreateTierPage';
import AllApiKeysPage from '~/app/pages/api-keys/AllApiKeysPage';

/**
 * MaaSWrapper is mounted at multiple extension routes:
 * - /maas/tiers/* (requires ADMIN_USER)
 * - /maas/tokens/*
 *
 * Routes here are relative to where MaaSWrapper is mounted.
 * The index route (path="/") needs to detect which section we're in.
 */
const IndexRedirect: React.FC = () => {
  const location = useLocation();

  if (location.pathname.startsWith('/maas/tiers')) {
    return <AllTiersPage />;
  }

  if (location.pathname.startsWith('/maas/tokens')) {
    return <AllApiKeysPage />;
  }

  // Default fallback
  return <Navigate to="/maas/tokens" replace />;
};

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<IndexRedirect />} />
    <Route path="/create" element={<CreateTierPage />} />
    <Route path="/view/:tierName" element={<ViewTierPage />} />
    <Route path="/edit/:tierName" element={<EditTierPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
