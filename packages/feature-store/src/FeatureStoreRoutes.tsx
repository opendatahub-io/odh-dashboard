import * as React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { FeatureStoreObject } from './const';
import FeatureStore from './FeatureStore';
import FeatureStoreCoreLoader from './FeatureStoreCoreLoader';
import FeatureStoreEntities from './screens/entities/FeatureStoreEntities';
import FeatureViews from './screens/featureViews/FeatureViews';
import FeatureViewDetails from './screens/featureViews/featureViewDetails/FeatureViewDetails';
import EntitiesDetailsPage from './screens/entities/EntitiesDetails/EntitiesDetailsPage';
import Features from './screens/features/Features';
import FeatureDetails from './screens/features/featureDetails/FeatureDetails';
import FeatureServices from './screens/featureServices/FeatureServices';
import FeatureServiceDetails from './screens/featureServices/featureServiceDetails/FeatureServiceDetails';
import FeatureStoreDataSets from './screens/dataSets/FeatureStoreDataSets';
import DataSetDetails from './screens/dataSets/DataSetDetails/DataSetDetails';
import DataSources from './screens/dataSources/DataSources';
import DataSourceDetailsPage from './screens/dataSources/dataSourceDetails/DataSourceDetailsPage';

export const featureStoreRootRoute = (): string => `/develop-train/feature-store`;

export const featureStoreRoute = (
  featureStoreObject: FeatureStoreObject,
  featureStoreProject?: string,
): string =>
  `/develop-train/feature-store/${featureStoreObject}${
    featureStoreProject ? `/${featureStoreProject}` : ''
  }`;

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
          getInvalidRedirectPath={(featureStoreObject) =>
            `/develop-train/feature-store/${featureStoreObject}`
          }
        />
      }
    >
      <Route index element={<Navigate to="overview" replace />} />
      <Route path="overview/:fsProjectName?/*" element={<FeatureStore empty={false} />} />
      <Route path="entities/:fsProjectName?/*" element={<FeatureStoreEntities />} />
      <Route path="feature-views/:fsProjectName?/*" element={<FeatureViews />} />
      <Route
        path="feature-views/:fsProjectName/:featureViewName"
        element={<FeatureViewDetails />}
      />
      <Route path="entities/:fsProjectName/:entityName" element={<EntitiesDetailsPage />} />
      <Route path="features/:fsProjectName?/*" element={<Features />} />
      <Route
        path="features/:fsProjectName?/:featureViewName/:featureName"
        element={<FeatureDetails />}
      />
      <Route path="feature-services/:fsProjectName?/*" element={<FeatureServices />} />
      <Route
        path="feature-services/:fsProjectName/:featureServiceName"
        element={<FeatureServiceDetails />}
      />
      <Route path="data-sources/:fsProjectName?/*" element={<DataSources />} />
      <Route
        path="data-sources/:fsProjectName/:dataSourceName"
        element={<DataSourceDetailsPage />}
      />
      <Route path="datasets/:fsProjectName?/*" element={<FeatureStoreDataSets />} />
      <Route path="datasets/:fsProjectName/:dataSetName" element={<DataSetDetails />} />
    </Route>
  </Routes>
);

export default FeatureStoreRoutes;
