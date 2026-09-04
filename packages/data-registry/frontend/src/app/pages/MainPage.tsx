import React from 'react';
import { Route, Routes } from 'react-router-dom';
import DataRegistryPage from './DataRegistryPage';
import TableDetailPage from './TableDetailPage';
import VolumeDetailPage from './VolumeDetailPage';
import CollectionDetailPage from './CollectionDetailPage';

const MainPage: React.FC = () => (
  <Routes>
    <Route path="collections/:project/:collection" element={<CollectionDetailPage />} />
    <Route path="tables/:project/:collection/:name" element={<TableDetailPage />} />
    <Route path="volumes/:project/:collection/:name" element={<VolumeDetailPage />} />
    <Route path="*" element={<DataRegistryPage />} />
  </Routes>
);

export default MainPage;
