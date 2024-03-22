import React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';

const ModelRegistryEmpty: React.FC = () => (
  <ApplicationsPage
    title="Registered models"
    description="View and manage your registered models."
    loaded
    empty
    provideChildrenPadding
  />
);

export default ModelRegistryEmpty;
