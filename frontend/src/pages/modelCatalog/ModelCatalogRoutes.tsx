import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ModelCatalogCoreLoader from './ModelCatalogCoreLoader';
import ModelDetailsPage from './screens/ModelDetailsPage';
import ModelCatalog from './screens/ModelCatalog';

const ModelCatalogRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<ModelCatalogCoreLoader />}>
      <Route index element={<ModelCatalog />} />
      <Route path=":sourceName/:repositoryName/:modelName/:tag" element={<ModelDetailsPage />} />
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </Routes>
);

export default ModelCatalogRoutes;
