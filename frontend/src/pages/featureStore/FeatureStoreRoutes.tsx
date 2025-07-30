import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import FeatureStore from './FeatureStore';
import FeatureStoreCoreLoader from './FeatureStoreCoreLoader';
import FeatureStoreEntities from './screens/entities/FeatureStoreEntities';
import FeatureViews from './screens/featureViews/FeatureViews';
import FeatureViewDetails from './screens/featureViews/featureViewDetails/FeatureViewDetails';
import { FeatureStoreObject } from './const';
import EntitiesDetailsPage from './screens/entities/EntitiesDetails/EntitiesDetailsPage';
import Features from './screens/features/Features';
import FeatureDetails from './screens/features/featureDetails/FeatureDetails';

export const featureStoreRootRoute = (): string => `/featureStore`;

export const featureStoreRoute = (
  featureStoreObject: FeatureStoreObject,
  featureStoreProject?: string,
): string =>
  `/featureStore/${featureStoreObject}${featureStoreProject ? `/${featureStoreProject}` : ''}`;

export const featureRoute = (
  featureName: string,
  featureViewName: string,
  featureStoreProject: string,
): string =>
  `${featureStoreRootRoute()}/features/${featureStoreProject}/${featureViewName}/${featureName}`;

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
      <Route path="entities/:fsProjectName/:entityName" element={<EntitiesDetailsPage />} />
      <Route path="features/:fsProjectName?/*" element={<Features />} />
      <Route
        path="features/:fsProjectName?/:featureViewName/:featureName"
        element={<FeatureDetails />}
      />
    </Route>
  </Routes>
);

export default FeatureStoreRoutes;
