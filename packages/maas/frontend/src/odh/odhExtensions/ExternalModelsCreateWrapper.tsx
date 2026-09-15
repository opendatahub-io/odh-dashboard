import React from 'react';
import CreateExternalModelPage from '~/app/pages/external-models/CreateExternalModelPage';
import ExternalModelsAreaProviders from './ExternalModelsAreaProviders';

const ExternalModelsCreateWrapper: React.FC = () => (
  <ExternalModelsAreaProviders>
    <CreateExternalModelPage />
  </ExternalModelsAreaProviders>
);

export default ExternalModelsCreateWrapper;
