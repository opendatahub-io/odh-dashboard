import React from 'react';
import { Route, Routes } from 'react-router-dom';
import DataRegistryPage from './DataRegistryPage';
import TableDetailPage from './TableDetailPage';
import CollectionDetailPage from './CollectionDetailPage';

const MainPage: React.FC = () => (
  <Routes>
    <Route path="collections/:project/:collection" element={<CollectionDetailPage />} />
    <Route path="assets/:assetType/:project/:collection/:name" element={<TableDetailPage />} />
    <Route path="*" element={<DataRegistryPage />} />
  </Routes>
);

export default MainPage;
