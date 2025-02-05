import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ModelCatalogCoreLoader from './ModelCatalogCoreLoader';
import ModelDetailsPage from './ModelDetailsPage';

const ModelCatalogRoutes: React.FC = () => (
  <Routes>
    <Route path="/:modelCatalog?/*" element={<ModelCatalogCoreLoader />}>
      <Route path="tempDetails">
        <Route index element={<ModelDetailsPage />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="." />} />
  </Routes>
);

export default ModelCatalogRoutes;
