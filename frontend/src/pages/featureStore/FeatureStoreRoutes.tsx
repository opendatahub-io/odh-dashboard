import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import FeatureStore from './FeatureStore';
import FeatureStoreCoreLoader from './FeatureStoreCoreLoader';
import FeatureStoreEntities from './screens/entities/FeatureStoreEntities';
import FeatureViews from './screens/featureViews/FeatureViews';
import FeatureViewDetails from './screens/featureViews/featureViewDetails/FeatureViewDetails';

const FeatureStoreRoutes: React.FC = () => (
  <Routes>
    <Route
      path="/"
      element={
        <FeatureStoreCoreLoader
          getInvalidRedirectPath={(featureStoreObject) => `/featureStore/${featureStoreObject}`}
        />
      }
    >
      <Route index element={<FeatureStore empty={false} />} />
      <Route path="entities/:fsProjectName?/*" element={<FeatureStoreEntities />} />
      <Route path="featureViews/:fsProjectName?/*" element={<FeatureViews />} />
      <Route path="featureViews/:fsProjectName/:featureViewName" element={<FeatureViewDetails />} />
    </Route>
  </Routes>
);

export default FeatureStoreRoutes;
