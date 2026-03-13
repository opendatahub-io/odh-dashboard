import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { PageSection } from '@patternfly/react-core';
import React from 'react';
import { useFetchApiKeys } from '~/app/hooks/useFetchApiKeys';
import { APIKey, APIKeyStatus } from '~/app/types/api-key';
import CreateApiKeyModal from './CreateApiKeyModal';
import ApiKeysTable from './allKeys/ApiKeysTable';
import EmptyApiKeysPage from './EmptyApiKeysPage';
import ApiKeysActions from './ApiKeysActions';
import ApiKeysToolbar, {
  ApiKeyFilterDataType,
  initialApiKeyFilterData,
} from './allKeys/ApiKeysToolbar';

const applyFilters = (apiKeys: APIKey[], filterData: ApiKeyFilterDataType): APIKey[] =>
  apiKeys.filter((key) => {
    if (
      filterData.username &&
      !key.username.toLowerCase().includes(filterData.username.toLowerCase())
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
      headerAction={<ApiKeysActions apiKeyCount={apiKeys.length} onRefresh={refresh} />}
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
            apiKeys={filteredApiKeys}
            toolbarContent={
              <ApiKeysToolbar
                setIsModalOpen={setIsModalOpen}
                filterData={filterData}
                onUsernameChange={onUsernameChange}
                onStatusToggle={onStatusToggle}
                onStatusClear={onStatusClear}
              />
            }
          />
        </PageSection>
      )}
    </ApplicationsPage>
  );
};
export default AllApiKeysPage;
