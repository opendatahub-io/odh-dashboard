import React from 'react';
import AllExternalModelsPage from '~/app/pages/external-models/AllExternalModelsPage';
import ExternalModelsAreaProviders from './ExternalModelsAreaProviders';

const ExternalModelsWrapper: React.FC = () => (
  <ExternalModelsAreaProviders>
    <AllExternalModelsPage />
  </ExternalModelsAreaProviders>
);

export default ExternalModelsWrapper;
