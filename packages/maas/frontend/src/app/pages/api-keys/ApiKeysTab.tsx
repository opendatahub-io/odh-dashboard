import { Bullseye, PageSection, Spinner } from '@patternfly/react-core';
import React from 'react';
import { useFetchApiKeys } from '~/app/hooks/useFetchApiKeys';
import { useIsMaasAdmin } from '~/app/hooks/useIsMaasAdmin';
import { useApiKeysTableState } from '~/app/hooks/useApiKeysTableState';
import { APIKey, APIKeySearchRequest } from '~/app/types/api-key';
import CreateApiKeyModal from './CreateApiKeyModal';
import EmptyApiKeysPage from './EmptyApiKeysPage';
import ApiKeysTable from './allKeys/ApiKeysTable';
import RevokeApiKeyModal from './RevokeApiKeyModal';
import ApiKeysToolbar from './allKeys/ApiKeysToolbar';

const EXISTENCE_CHECK_REQUEST: APIKeySearchRequest = { pagination: { limit: 1, offset: 0 } };

const ApiKeysTab: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [revokeApiKey, setRevokeApiKey] = React.useState<APIKey | undefined>(undefined);

  const [isMaasAdmin, isMaasAdminLoaded] = useIsMaasAdmin();

  const {
    response,
    loaded,
    refresh,
    filterData,
    localUsername,
    setLocalUsername,
    page,
    perPage,
    sortField,
    sortDirection,
    isFetching,
    onUsernameChange,
    onStatusToggle,
    onStatusClear,
    onSort,
    onSetPage,
    onPerPageSelect,
    onClearFilters,
  } = useApiKeysTableState();

  const [existenceResponse, existenceLoaded, , refreshExistence] =
    useFetchApiKeys(EXISTENCE_CHECK_REQUEST);
  const hasAnyApiKeys = response.data.length > 0 || existenceResponse.data.length > 0;

  const refreshAll = React.useCallback(() => {
    refresh();
    refreshExistence();
  }, [refresh, refreshExistence]);

  const apiKeys = response.data;
  const hasMore = response.has_more;
  const { subscriptionDetails } = response;

  const activeApiKeys = apiKeys.filter((apiKey) => apiKey.status === 'active');

  if (!loaded || !isMaasAdminLoaded || (!hasAnyApiKeys && !existenceLoaded)) {
    return (
      <PageSection isFilled>
        <Bullseye>
          <Spinner />
        </Bullseye>
      </PageSection>
    );
  }

  if (existenceLoaded && !hasAnyApiKeys) {
    return (
      <>
        {isModalOpen && (
          <CreateApiKeyModal
            onClose={() => {
              setIsModalOpen(false);
              refreshAll();
            }}
          />
        )}
        <EmptyApiKeysPage onCreateApiKey={() => setIsModalOpen(true)} />
      </>
    );
  }

  return (
    <>
      {isModalOpen && (
        <CreateApiKeyModal
          onClose={() => {
            setIsModalOpen(false);
            refreshAll();
          }}
        />
      )}
      <PageSection isFilled>
        <ApiKeysTable
          onRevokeApiKey={setRevokeApiKey}
          apiKeys={apiKeys}
          subscriptionDetails={subscriptionDetails}
          hasMore={hasMore}
          page={page}
          perPage={perPage}
          sortField={sortField}
          sortDirection={sortDirection}
          onSetPage={onSetPage}
          onPerPageSelect={onPerPageSelect}
          onSort={onSort}
          onClearFilters={onClearFilters}
          isFetching={isFetching}
          isMaasAdmin={isMaasAdmin}
          toolbarContent={
            <ApiKeysToolbar
              isMaasAdmin={isMaasAdmin}
              setIsModalOpen={setIsModalOpen}
              filterData={filterData}
              localUsername={localUsername}
              setLocalUsername={setLocalUsername}
              onUsernameChange={onUsernameChange}
              onStatusToggle={onStatusToggle}
              onStatusClear={onStatusClear}
              activeApiKeys={activeApiKeys}
              refresh={refreshAll}
              onClearFilters={onClearFilters}
            />
          }
        />
      </PageSection>
      {revokeApiKey && revokeApiKey.name && (
        <RevokeApiKeyModal
          apiKey={revokeApiKey}
          onClose={(revoked) => {
            setRevokeApiKey(undefined);
            if (revoked) {
              refreshAll();
            }
          }}
        />
      )}
    </>
  );
};

export default ApiKeysTab;
