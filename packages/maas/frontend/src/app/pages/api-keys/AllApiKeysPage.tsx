import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { Button, PageSection } from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import React from 'react';
import { useFetchApiKeys } from '~/app/hooks/useFetchApiKeys';
import CreateApiKeyModal from './CreateApiKeyModal';
import ApiKeysTable from './allKeys/ApiKeysTable';
import EmptyApiKeysPage from './EmptyApiKeysPage';
import ApiKeysActions from './ApiKeysActions';

const AllApiKeysPage: React.FC = () => {
  const [apiKeys, loaded, error, refresh] = useFetchApiKeys();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <ApplicationsPage
      title="API Keys"
      description="Manage personal API keys that can be used to access AI asset endpoints."
      empty={loaded && !error && apiKeys.length === 0}
      loaded={loaded}
      loadError={error}
      emptyStatePage={<EmptyApiKeysPage />}
      headerAction={<ApiKeysActions apiKeyCount={apiKeys.length} onRefresh={refresh} />}
    >
      <CreateApiKeyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {loaded && (
        <PageSection isFilled>
          <ApiKeysTable
            apiKeys={apiKeys}
            toolbarContent={
              <Button
                variant="primary"
                icon={<PlusIcon />}
                onClick={() => setIsModalOpen(true)}
                data-testid="create-api-key-button"
              >
                Create API key
              </Button>
            }
          />
        </PageSection>
      )}
    </ApplicationsPage>
  );
};
export default AllApiKeysPage;
