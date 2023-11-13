import * as React from 'react';
import { Routes, Route } from 'react-router-dom';
import EdgeModels from './EdgeModels';

const EdgeModelsRoutes: React.FC = () => (
  <Routes>
    <Route path="/models" element={<EdgeModels />} />
  </Routes>
);

export default EdgeModelsRoutes;
