// basic page layout for all api keys

import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { PageSection } from '@patternfly/react-core';
import React from 'react';
import { useFetchApiKeys } from '~/app/hooks/useFetchApiKeys';

const AllApiKeysPage: React.FC = () => {
  const [apiKeys, loaded, error] = useFetchApiKeys();
  return (
    <ApplicationsPage
      title="API Keys"
      description="API Keys"
      empty={false}
      loaded={loaded}
      loadError={error}
    >
      {loaded && (
        <PageSection isFilled>
          {apiKeys.map((apiKey) => (
            <div key={apiKey.id}>
              <div>{apiKey.name}</div>
              <div>{apiKey.description}</div>
              <div>{new Date(apiKey.creationDate).toLocaleString()}</div>
              <div>{new Date(apiKey.expirationDate).toLocaleString()}</div>
              <div>{apiKey.status}</div>
            </div>
          ))}
        </PageSection>
      )}
    </ApplicationsPage>
  );
};

export default AllApiKeysPage;
