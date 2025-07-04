import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import FeatureStore from './screens/FeatureStore';

const FeatureStoreRoutes: React.FC = () => (
  <Routes>
    <Route path="/overview" element={<FeatureStore />} />
    <Route path="/entities" element={<>Entities Page</>} />
    <Route path="/data-sources" element={<>Data Sources Page</>} />
    <Route path="/data-sets" element={<>Data Sets Page</>} />
    <Route path="/features" element={<>Features Page</>} />
    <Route path="/feature-views" element={<>Feature Views Page</>} />
    <Route path="/feature-services" element={<>Feature Services Page</>} />
  </Routes>
);

export default FeatureStoreRoutes;
