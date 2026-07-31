import { Bullseye, Content, ContentVariants, PageSection, Spinner } from '@patternfly/react-core';
import React from 'react';
import PageLoadErrorState from '~/app/components/PageLoadErrorState';
import { useApiKeysPageLoad } from '~/app/hooks/useApiKeysPageLoad';
import { useUserSubscriptions } from '~/app/hooks/useUserSubscriptions';
import { APIKey } from '~/app/types/api-key';
import CreateApiKeyModal from './CreateApiKeyModal';
import EmptyApiKeysPage from './EmptyApiKeysPage';
import ApiKeysTable from './allKeys/ApiKeysTable';
import RevokeApiKeyModal from './RevokeApiKeyModal';
import ApiKeysToolbar from './allKeys/ApiKeysToolbar';

type ApiKeysTabProps = {
  showDescription?: boolean;
};

const ApiKeysTab: React.FC<ApiKeysTabProps> = ({ showDescription }) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [revokeApiKey, setRevokeApiKey] = React.useState<APIKey | undefined>(undefined);

  const pageState = useApiKeysPageLoad();
  const [subscriptions, subscriptionsLoaded] = useUserSubscriptions();

  const {
    isMaasAdmin,
    isMaasAdminLoaded,
    response,
    hasAnyApiKeys,
    existenceLoaded,
    loaded,
    loadError,
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
      showDescription && subscriptionsLoaded
        ? subscriptions.map((sub) => ({
            name: sub.subscription_id_header,
            displayName: sub.display_name ?? sub.subscription_id_header,
          }))
        : [],
    [showDescription, subscriptions, subscriptionsLoaded],
  );

  const apiKeys = response.data;
  const hasMore = response.has_more;
  const { subscriptionDetails } = response;

  const activeApiKeys = apiKeys.filter((apiKey) => apiKey.status === 'active');

  if (loadError) {
    return <PageLoadErrorState error={loadError} title="Error loading API keys" />;
  }

  if (
    !loaded ||
    !isMaasAdminLoaded ||
    (!hasAnyApiKeys && !existenceLoaded) ||
    (showDescription && !subscriptionsLoaded)
  ) {
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
