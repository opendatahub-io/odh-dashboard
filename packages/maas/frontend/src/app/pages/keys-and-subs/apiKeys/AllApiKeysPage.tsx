import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import React from 'react';
import ApiKeysTab from './ApiKeysTab';

// TODO: Remove once we GA the My Subscriptions feature
// This is left behind in case we turn off the My Subscriptions feature.

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
