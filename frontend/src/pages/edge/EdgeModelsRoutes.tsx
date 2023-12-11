import * as React from 'react';
import { Routes, Route } from 'react-router-dom';
import EdgeContextProvider from '~/concepts/edge/content/EdgeContext';
import EdgeModels from './EdgeModels';
import EdgePipelinesPage from './screens/edgePipelines/EdgePipelinesPage';

const EdgeModelsRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<EdgeContextProvider />}>
      <Route path="/edgeModels" element={<EdgeModels />} />
      <Route path="/edgePipelines" element={<EdgePipelinesPage />} />
    </Route>
  </Routes>
);

export default EdgeModelsRoutes;
