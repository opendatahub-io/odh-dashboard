import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import { FeatureStoreProjectContextProvider } from '#~/concepts/featureStore/context/FeatureStoreProjectContext.tsx';
import FeatureStoreCoreLoader from './FeatureStoreCoreLoader';
import FeatureStore from './FeatureStore';

export const featureStoreRoute = (preferredFeatureStore = ''): string =>
  `/featureStore/${preferredFeatureStore}`;

const FeatureStoreRoutes: React.FC = () => (
  <FeatureStoreProjectContextProvider>
    <Routes>
      <Route
        path="/overview/:namespace?/*"
        element={
          <FeatureStoreCoreLoader
            getInvalidRedirectPath={(featureStore) => featureStoreRoute(featureStore)}
          />
        }
      >
        <Route index element={<FeatureStore empty={false} />} />
      </Route>
    </Routes>
  </FeatureStoreProjectContextProvider>
);

export default FeatureStoreRoutes;
