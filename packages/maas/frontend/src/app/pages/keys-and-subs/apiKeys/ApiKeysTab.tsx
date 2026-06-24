import { Bullseye, Content, ContentVariants, PageSection, Spinner } from '@patternfly/react-core';
import React from 'react';
import { type UseApiKeysPageLoadReturn } from '~/app/hooks/useApiKeysPageLoad';
import { APIKey } from '~/app/types/api-key';
import { UserSubscription } from '~/app/types/subscriptions';
import CreateApiKeyModal from './CreateApiKeyModal';
import EmptyApiKeysPage from './EmptyApiKeysPage';
import ApiKeysTable from './allKeys/ApiKeysTable';
import RevokeApiKeyModal from './RevokeApiKeyModal';
import ApiKeysToolbar from './allKeys/ApiKeysToolbar';

type ApiKeysTabProps = {
  pageState: UseApiKeysPageLoadReturn;
  subscriptions: UserSubscription[];
  showDescription?: boolean;
};

const ApiKeysTab: React.FC<ApiKeysTabProps> = ({ pageState, subscriptions, showDescription }) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [revokeApiKey, setRevokeApiKey] = React.useState<APIKey | undefined>(undefined);

  const {
    isMaasAdmin,
    isMaasAdminLoaded,
    response,
    hasAnyApiKeys,
    existenceLoaded,
    loaded,
    refreshAll,
    filterData,
    isKeyInactive,
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
    onSubscriptionChange,
    onSort,
    onSetPage,
    onPerPageSelect,
    onClearFilters,
  } = pageState;

  const subscriptionOptions = React.useMemo(
    () =>
      subscriptions.map((sub) => ({
        name: sub.subscription_id_header,
        displayName: sub.display_name ?? sub.subscription_id_header,
      })),
    [subscriptions],
  );

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
        {showDescription && (
          <Content component={ContentVariants.p}>
            Manage API keys that can be used to authenticate with model endpoints.
          </Content>
        )}
        <ApiKeysTable
          onRevokeApiKey={setRevokeApiKey}
          apiKeys={apiKeys}
          subscriptionDetails={subscriptionDetails}
          isKeyInactive={isKeyInactive}
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
              subscriptions={subscriptionOptions}
              onSubscriptionChange={onSubscriptionChange}
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
