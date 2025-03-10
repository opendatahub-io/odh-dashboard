import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ModelCatalogCoreLoader from './ModelCatalogCoreLoader';
import ModelDetailsPage from './screens/ModelDetailsPage';
import ModelCatalog from './screens/ModelCatalog';
import RegisterCatalogModel from './screens/RegisterCatalogModel';

const ModelCatalogRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<ModelCatalogCoreLoader />}>
      <Route index element={<ModelCatalog />} />
      <Route path=":sourceName/:repositoryName/:modelName/:tag">
        <Route index element={<ModelDetailsPage />} />
        <Route path="register" element={<RegisterCatalogModel />} />
        <Route path="*" element={<Navigate to="." />} />
      </Route>
      <Route path="*" element={<Navigate to="." />} />
    </Route>
  </Routes>
);

export default ModelCatalogRoutes;
