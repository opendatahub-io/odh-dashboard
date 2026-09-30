import React from 'react';
import EditExternalModelPage from '~/app/pages/external-models/EditExternalModelPage';
import ExternalModelsAreaProviders from './ExternalModelsAreaProviders';

const ExternalModelsEditWrapper: React.FC = () => (
  <ExternalModelsAreaProviders>
    <EditExternalModelPage />
  </ExternalModelsAreaProviders>
);

export default ExternalModelsEditWrapper;
