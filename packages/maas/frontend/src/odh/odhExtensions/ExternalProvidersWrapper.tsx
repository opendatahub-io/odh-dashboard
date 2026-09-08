import React from 'react';
import { Route, Routes } from 'react-router-dom';
import AllExternalProvidersPage from '~/app/pages/external-providers/AllExternalProvidersPage';
import { ExternalModelsProvider } from '~/app/context/ExternalModelsContext';
import MaaSFederatedProviders from './MaaSFederatedProviders';

const ExternalProvidersPageRoute: React.FC = () => (
  <ExternalModelsProvider>
    <AllExternalProvidersPage />
  </ExternalModelsProvider>
);

const ExternalProvidersWrapper: React.FC = () => (
  <MaaSFederatedProviders>
    <Routes>
      <Route path=":namespace" element={<ExternalProvidersPageRoute />} />
      <Route path="" element={<ExternalProvidersPageRoute />} />
    </Routes>
  </MaaSFederatedProviders>
);

export default ExternalProvidersWrapper;
