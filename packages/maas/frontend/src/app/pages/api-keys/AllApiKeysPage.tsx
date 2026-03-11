import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { PageSection } from '@patternfly/react-core';
import React from 'react';
import { useFetchApiKeys } from '~/app/hooks/useFetchApiKeys';
import { useIsMaasAdmin } from '~/app/hooks/useIsMaasAdmin';
import { APIKey, APIKeyStatus } from '~/app/types/api-key';
import CreateApiKeyModal from './CreateApiKeyModal';
import ApiKeysTable from './allKeys/ApiKeysTable';
import EmptyApiKeysPage from './EmptyApiKeysPage';
import RevokeApiKeyModal from './RevokeApiKeyModal';
import ApiKeysToolbar, {
  ApiKeyFilterDataType,
  initialApiKeyFilterData,
} from './allKeys/ApiKeysToolbar';

const applyFilters = (apiKeys: APIKey[], filterData: ApiKeyFilterDataType): APIKey[] =>
  apiKeys.filter((key) => {
    if (
      filterData.username &&
      !key.username?.toLowerCase().includes(filterData.username.toLowerCase())
    ) {
      return false;
    }
    if (filterData.statuses.length > 0 && !filterData.statuses.includes(key.status)) {
      return false;
    }
    return true;
  });

const AllApiKeysPage: React.FC = () => {
  const [apiKeys, loaded, error, refresh] = useFetchApiKeys();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [revokeApiKey, setRevokeApiKey] = React.useState<APIKey | undefined>(undefined);

  // TODO: use this for hiding the username search for non-admins and for allowing admins to see all keys
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isMaasAdmin] = useIsMaasAdmin();

  const activeApiKeys = apiKeys.filter((apiKey) => apiKey.status === 'active');
  const [filterData, setFilterData] = React.useState<ApiKeyFilterDataType>(initialApiKeyFilterData);

  const onUsernameChange = React.useCallback((value: string) => {
    setFilterData((prev) => ({ ...prev, username: value }));
  }, []);

  const onStatusToggle = React.useCallback((status: APIKeyStatus) => {
    setFilterData((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }));
  }, []);

  const onStatusClear = React.useCallback((status: APIKeyStatus) => {
    setFilterData((prev) => ({
      ...prev,
      statuses: prev.statuses.filter((s) => s !== status),
    }));
  }, []);

  const filteredApiKeys = applyFilters(apiKeys, filterData);

  return (
    <ApplicationsPage
      title="API Keys"
      description="Manage personal API keys that can be used to access AI asset endpoints."
      empty={loaded && !error && apiKeys.length === 0}
      loaded={loaded}
      loadError={error}
      emptyStatePage={<EmptyApiKeysPage onRefresh={() => refresh()} />}
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
            onRevokeApiKey={setRevokeApiKey}
            apiKeys={filteredApiKeys}
            toolbarContent={
              <ApiKeysToolbar
                setIsModalOpen={setIsModalOpen}
                filterData={filterData}
                onUsernameChange={onUsernameChange}
                onStatusToggle={onStatusToggle}
                onStatusClear={onStatusClear}
                activeApiKeys={activeApiKeys}
                refresh={refresh}
              />
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
