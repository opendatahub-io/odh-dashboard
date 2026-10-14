import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import RuntimeCatalogView from './RuntimeCatalogView';

const RuntimeCatalogTabRoutes: React.FC = () => (
  <Routes>
    <Route index element={<RuntimeCatalogView />} />
    <Route path="*" element={<Navigate to="." replace />} />
  </Routes>
);

export default RuntimeCatalogTabRoutes;
