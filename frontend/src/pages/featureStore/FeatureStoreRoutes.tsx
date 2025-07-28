import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import FeatureStore from './FeatureStore';
import FeatureStoreCoreLoader from './FeatureStoreCoreLoader';
import FeatureStoreEntities from './screens/entities/FeatureStoreEntities';
import { FeatureStoreObject } from './const';

export const featureStoreRoute = (
  featureStoreObject: FeatureStoreObject,
  featureStoreProject?: string,
): string =>
  `/featureStore/${featureStoreObject}${featureStoreProject ? `/${featureStoreProject}` : ''}`;

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
    </Route>
  </Routes>
);

export default FeatureStoreRoutes;
