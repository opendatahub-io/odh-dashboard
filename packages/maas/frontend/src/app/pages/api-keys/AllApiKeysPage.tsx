import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import React from 'react';
import ApiKeysTab from './ApiKeysTab';

const AllApiKeysPage: React.FC = () => (
  <ApplicationsPage
    title="API keys"
    description="Manage API keys that can be used to authenticate with model endpoints."
    loaded
    empty={false}
  >
    <ApiKeysTab />
  </ApplicationsPage>
);

export default AllApiKeysPage;
