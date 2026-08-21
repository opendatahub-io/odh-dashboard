import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { accessAllowedRouteHoC } from '@odh-dashboard/internal/concepts/userSSAR/accessAllowedRouteHoC';
import { verbModelAccess } from '@odh-dashboard/internal/concepts/userSSAR/utils';
import FeatureStoreListPage from './FeatureStoreListPage';

const GatedListPage = accessAllowedRouteHoC(verbModelAccess('list', FeatureStoreModel))(
  FeatureStoreListPage,
);

const FeatureStoreManageRoutes: React.FC = () => (
  <Routes>
    <Route index element={<GatedListPage />} />
    <Route path="*" element={<GatedListPage />} />
  </Routes>
);

export default FeatureStoreManageRoutes;
