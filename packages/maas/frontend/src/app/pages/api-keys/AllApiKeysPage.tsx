import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { PageSection } from '@patternfly/react-core';
import React from 'react';
import { useFetchApiKeys } from '~/app/hooks/useFetchApiKeys';
import ApiKeysTable from './allKeys/ApiKeysTable';
import EmptyApiKeysPage from './EmptyApiKeysPage';

const AllApiKeysPage: React.FC = () => {
  const [apiKeys, loaded, error] = useFetchApiKeys();

  return (
    <ApplicationsPage
      title="API Keys"
      description="Manage personal API keys that can be used to access AI asset endpoints."
      empty={loaded && !error && apiKeys.length === 0}
      loaded={loaded}
      loadError={error}
      emptyStatePage={<EmptyApiKeysPage />}
    >
      {loaded && (
        <PageSection isFilled>
          <ApiKeysTable apiKeys={apiKeys} />
        </PageSection>
      )}
    </ApplicationsPage>
  );
};
export default AllApiKeysPage;
