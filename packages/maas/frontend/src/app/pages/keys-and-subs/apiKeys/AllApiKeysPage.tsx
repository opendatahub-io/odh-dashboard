import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import React from 'react';
import { useApiKeysPageLoad } from '~/app/hooks/useApiKeysPageLoad';
import ApiKeysTab from './ApiKeysTab';

// TODO: Remove once we GA the My Subscriptions feature
// This is left behind in case we turn off the My Subscriptions feature.

const AllApiKeysPage: React.FC = () => {
  const pageState = useApiKeysPageLoad();
  const { loadError, loaded } = pageState;

  return (
    <ApplicationsPage
      title="API keys"
      description="Manage API keys that can be used to authenticate with model endpoints."
      loaded={loaded || !!loadError}
      empty={false}
      loadError={loadError}
      errorMessage="Error loading API keys"
    >
      {!loadError && <ApiKeysTab pageState={pageState} subscriptions={[]} />}
    </ApplicationsPage>
  );
};

export default AllApiKeysPage;
