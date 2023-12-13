import * as React from 'react';
import { Routes, Route } from 'react-router-dom';
import EdgeContextProvider from '~/concepts/edge/content/EdgeContext';
import EdgeModels from '~/pages/edge/screens/models/EdgeModelsPage';

const EdgeModelsRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<EdgeContextProvider />}>
      <Route index element={<EdgeModels />} />
    </Route>
  </Routes>
);

export default EdgeModelsRoutes;
