import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ModelCatalogCoreLoader from './ModelCatalogCoreLoader';
import ModelDetailsPage from './ModelDetailsPage';
import ModelCatalog from './screens/ModelCatalog';

const ModelCatalogRoutes: React.FC = () => (
  <Routes>
    <Route path={'/:modelCatalogSource?/*'} element={<ModelCatalogCoreLoader />}>
      <Route index element={<ModelCatalog />} />
      <Route path="tempDetails" element={<ModelDetailsPage />} />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </Routes>
);

export default ModelCatalogRoutes;
