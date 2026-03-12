import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { Button, PageSection } from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import React from 'react';
import { useFetchApiKeys } from '~/app/hooks/useFetchApiKeys';
import { APIKey } from '~/app/types/api-key';
import CreateApiKeyModal from './CreateApiKeyModal';
import ApiKeysTable from './allKeys/ApiKeysTable';
import EmptyApiKeysPage from './EmptyApiKeysPage';
import ApiKeysActions from './ApiKeysActions';
import RevokeApiKeyModal from './RevokeApiKeyModal';

const AllApiKeysPage: React.FC = () => {
  const [apiKeys, loaded, error, refresh] = useFetchApiKeys();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [revokeApiKey, setRevokeApiKey] = React.useState<APIKey | undefined>(undefined);

  const activeApiKeys = apiKeys.filter((apiKey) => apiKey.status === 'active');

  return (
    <ApplicationsPage
      title="API Keys"
      description="Manage personal API keys that can be used to access AI asset endpoints."
      empty={loaded && !error && apiKeys.length === 0}
      loaded={loaded}
      loadError={error}
      emptyStatePage={<EmptyApiKeysPage onRefresh={() => refresh()} />}
      headerAction={<ApiKeysActions apiKeyCount={activeApiKeys.length} onRefresh={refresh} />}
    >
      {isModalOpen && (
        <CreateApiKeyModal
          onClose={() => {
            setIsModalOpen(false);
            refresh();
          }}
        />
      )}

      {loaded && (
        <PageSection isFilled>
          <ApiKeysTable
            apiKeys={apiKeys}
            onRevokeApiKey={setRevokeApiKey}
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
      {revokeApiKey && revokeApiKey.name && (
        <RevokeApiKeyModal
          apiKey={revokeApiKey}
          onClose={(revoked) => {
            setRevokeApiKey(undefined);
            if (revoked) {
              refresh();
            }
          }}
        />
      )}
    </ApplicationsPage>
  );
};
export default AllApiKeysPage;
