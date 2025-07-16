import * as React from 'react';
import { Route } from 'react-router-dom';
import ProjectsRoutes from '#~/concepts/projects/ProjectsRoutes.tsx';
import FeatureStoreCoreLoader from './FeatureStoreCoreLoader';
import FeatureStore from './FeatureStore';

export const featureStoreRoute = (preferredFeatureStore = ''): string =>
  `/featureStore/${preferredFeatureStore}`;

const FeatureStoreRoutes: React.FC = () => (
  <ProjectsRoutes>
    <Route
      path="overview/:namespace?/*"
      element={
        <FeatureStoreCoreLoader
          getInvalidRedirectPath={(featureStore) => featureStoreRoute(featureStore)}
        />
      }
    >
      <Route index element={<FeatureStore empty={false} />} />
    </Route>
  </ProjectsRoutes>
);

export default FeatureStoreRoutes;
