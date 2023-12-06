import * as React from 'react';
import { Routes, Route } from 'react-router-dom';
import EdgeContextProvider from '~/concepts/edge/EdgeContext';
import EdgeModels from './EdgeModels';

const EdgeModelsRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<EdgeContextProvider />}>
      <Route path="/models" element={<EdgeModels />} />
    </Route>
  </Routes>
);

export default EdgeModelsRoutes;
