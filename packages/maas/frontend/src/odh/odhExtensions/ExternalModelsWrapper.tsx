import React from 'react';
import AllExternalModelsPage from '~/app/pages/external-models/AllExternalModelsPage';
import { ExternalModelsProvider } from '~/app/context/ExternalModelsContext';
import MaaSFederatedProviders from './MaaSFederatedProviders';

const ExternalModelsWrapper: React.FC = () => (
  <MaaSFederatedProviders>
    <ExternalModelsProvider>
      <AllExternalModelsPage />
    </ExternalModelsProvider>
  </MaaSFederatedProviders>
);

export default ExternalModelsWrapper;
