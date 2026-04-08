import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { PageSection } from '@patternfly/react-core';
import React from 'react';
import { useFetchApiKeys } from '~/app/hooks/useFetchApiKeys';
import { useIsMaasAdmin } from '~/app/hooks/useIsMaasAdmin';
import {
  APIKeyStatus,
  APIKeySearchRequest,
  APIKey,
  ApiKeyFilterDataType,
  initialApiKeyFilterData,
  emptyApiKeyFilterData,
} from '~/app/types/api-key';
import { ApiKeySortField } from './allKeys/columns';
import CreateApiKeyModal from './CreateApiKeyModal';
import ApiKeysTable from './allKeys/ApiKeysTable';
import EmptyApiKeysPage from './EmptyApiKeysPage';
import RevokeApiKeyModal from './RevokeApiKeyModal';
import ApiKeysToolbar from './allKeys/ApiKeysToolbar';

type SortDirection = 'asc' | 'desc';

const DEFAULT_SORT_FIELD: ApiKeySortField = 'created_at';
const DEFAULT_SORT_DIRECTION: SortDirection = 'desc';
const DEFAULT_PER_PAGE = 50;

const AllApiKeysPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [revokeApiKey, setRevokeApiKey] = React.useState<APIKey | undefined>(undefined);

  const [isMaasAdmin] = useIsMaasAdmin();

  const [filterData, setFilterData] = React.useState<ApiKeyFilterDataType>(initialApiKeyFilterData);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(DEFAULT_PER_PAGE);
  const [sortField, setSortField] = React.useState<ApiKeySortField>(DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(DEFAULT_SORT_DIRECTION);

  const searchRequest: APIKeySearchRequest = React.useMemo(
    () => ({
      filters: {
        ...(filterData.username && { username: filterData.username }),
        ...(filterData.statuses.length > 0 && { status: filterData.statuses }),
      },
      sort: { by: sortField, order: sortDirection },
      pagination: { limit: perPage, offset: (page - 1) * perPage },
    }),
    [filterData, sortField, sortDirection, page, perPage],
  );

  const [response, loaded, error, refresh] = useFetchApiKeys(searchRequest);
  const [localUsername, setLocalUsername] = React.useState('');

  const apiKeys = response.data;
  const hasMore = response.has_more;
  const { subscriptionDetails } = response;

  const activeApiKeys = apiKeys.filter((apiKey) => apiKey.status === 'active');

  const [isFetching, setIsFetching] = React.useState(false);
  React.useEffect(() => {
    setIsFetching(false);
  }, [response]);

  const onUsernameChange = React.useCallback(
    (value: string) => {
      setFilterData((prev) => ({ ...prev, username: value }));
      setPage(1);
      setIsFetching(value !== localUsername);
    },
    [localUsername],
  );

  const onStatusToggle = React.useCallback((status: APIKeyStatus) => {
    setFilterData((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }));
    setPage(1);
    setIsFetching(true);
  }, []);

  const onStatusClear = React.useCallback((status: APIKeyStatus) => {
    setFilterData((prev) => ({
      ...prev,
      statuses: prev.statuses.filter((s) => s !== status),
    }));
    setPage(1);
    setIsFetching(true);
  }, []);

  const onSort = React.useCallback((field: ApiKeySortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
    setPage(1);
    setIsFetching(true);
  }, []);

  const onSetPage = React.useCallback((newPage: number) => {
    setPage(newPage);
    setIsFetching(true);
  }, []);

  const onPerPageSelect = React.useCallback((newPerPage: number, newPage: number) => {
    setPerPage(newPerPage);
    setPage(Math.max(1, newPage));
    setIsFetching(true);
  }, []);
  const hasActiveFilters =
    filterData.username !== initialApiKeyFilterData.username ||
    JSON.stringify([...filterData.statuses].toSorted()) !==
      JSON.stringify([...initialApiKeyFilterData.statuses].toSorted());

  const onClearFilters = React.useCallback(() => {
    setFilterData(emptyApiKeyFilterData);
    setPage(1);
    setLocalUsername('');
    setIsFetching(true);
  }, []);

  return (
    <ApplicationsPage
      title="API Keys"
      description="Manage personal API keys that can be used to access AI asset endpoints."
      empty={
        loaded && !error && apiKeys.length === 0 && page === 1 && !hasActiveFilters && !isFetching
      }
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
