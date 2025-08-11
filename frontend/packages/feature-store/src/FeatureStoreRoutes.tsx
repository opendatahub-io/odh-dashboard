import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import FeatureStore from './FeatureStore';

const FeatureStoreRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/featureStore/overview" replace />} />
    <Route path="/overview" element={<FeatureStore />} />
    <Route
      path="/entities"
      element={
        <FeatureStore
          title="Entities"
          description="Manage and organize feature entities for your feature store."
        />
      }
    />
    <Route
      path="/dataSources"
      element={
        <FeatureStore
          title="Data Sources"
          description="Configure and manage data sources for feature engineering."
        />
      }
    />
    <Route
      path="/dataSets"
      element={
        <FeatureStore
          title="Data Sets"
          description="View and manage feature data sets and training datasets."
        />
      }
    />
    <Route
      path="/features"
      element={
        <FeatureStore
          title="Features"
          description="Browse and manage individual features across your feature store."
        />
      }
    />
    <Route
      path="/featureViews"
      element={
        <FeatureStore
          title="Feature Views"
          description="Create and manage feature views for model training and serving."
        />
      }
    />
    <Route
      path="/featureServices"
      element={
        <FeatureStore
          title="Feature Services"
          description="Deploy and manage feature services for real-time inference."
        />
      }
    />
    <Route path="*" element={<Navigate to="/featureStore/overview" replace />} />
  </Routes>
);

export default FeatureStoreRoutes;
