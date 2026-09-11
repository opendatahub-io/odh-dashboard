import React from 'react';
import { ExternalModelsProvider } from '~/app/context/ExternalModelsContext';
import MaaSFederatedProviders from './MaaSFederatedProviders';

type ExternalModelsAreaProvidersProps = {
  children: React.ReactNode;
};

const ExternalModelsAreaProviders: React.FC<ExternalModelsAreaProvidersProps> = ({ children }) => (
  <MaaSFederatedProviders>
    <ExternalModelsProvider>{children}</ExternalModelsProvider>
  </MaaSFederatedProviders>
);

export default ExternalModelsAreaProviders;
