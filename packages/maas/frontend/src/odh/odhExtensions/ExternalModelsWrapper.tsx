import React from 'react';
import AllExternalModelsPage from '~/app/pages/external-models/AllExternalModelsPage';
import MaaSFederatedProviders from './MaaSFederatedProviders';

const ExternalModelsWrapper: React.FC = () => (
  <MaaSFederatedProviders>
    <AllExternalModelsPage />
  </MaaSFederatedProviders>
);

export default ExternalModelsWrapper;
