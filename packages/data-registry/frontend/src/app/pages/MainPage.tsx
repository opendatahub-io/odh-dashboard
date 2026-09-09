import React from 'react';
import { Route, Routes } from 'react-router-dom';
import DataRegistryPage from './DataRegistryPage';
import TableDetailPage from './TableDetailPage';

const MainPage: React.FC = () => (
  <Routes>
    <Route path="assets/:assetType/:project/:collection/:name" element={<TableDetailPage />} />
    <Route path="*" element={<DataRegistryPage />} />
  </Routes>
);

export default MainPage;
