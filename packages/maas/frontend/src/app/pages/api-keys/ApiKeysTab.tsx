import { Bullseye, PageSection, Spinner } from '@patternfly/react-core';
import React from 'react';
import { useIsMaasAdmin } from '~/app/hooks/useIsMaasAdmin';
import { useApiKeysTableState } from '~/app/hooks/useApiKeysTableState';
import { APIKey } from '~/app/types/api-key';
import CreateApiKeyModal from './CreateApiKeyModal';
import ApiKeysTable from './allKeys/ApiKeysTable';
import RevokeApiKeyModal from './RevokeApiKeyModal';
import ApiKeysToolbar from './allKeys/ApiKeysToolbar';

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

  const apiKeys = response.data;
  const hasMore = response.has_more;
  const { subscriptionDetails } = response;

  const activeApiKeys = apiKeys.filter((apiKey) => apiKey.status === 'active');

  if (!loaded || !isMaasAdminLoaded) {
    return (
      <PageSection isFilled>
        <Bullseye>
          <Spinner />
        </Bullseye>
      </PageSection>
    );
  }

  return (
    <>
      {isModalOpen && (
        <CreateApiKeyModal
          onClose={() => {
            setIsModalOpen(false);
            refresh();
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
              refresh={refresh}
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
              refresh();
            }
          }}
        />
      )}
    </>
  );
};

export default ApiKeysTab;
