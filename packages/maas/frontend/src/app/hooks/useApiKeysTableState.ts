import React from 'react';
import {
  APIKey,
  APIKeyStatus,
  APIKeyDisplayStatus,
  APIKeySearchRequest,
  ApiKeyFilterDataType,
  initialApiKeyFilterData,
  emptyApiKeyFilterData,
  APIKeyListResponse,
} from '~/app/types/api-key';
import { ApiKeySortField } from '~/app/pages/keys-and-subs/apiKeys/allKeys/columns';
import { applyInactiveFilter, isKeyInactive as isKeyInactiveUtil } from '~/app/utilities/apiKeys';
import { useFetchApiKeys } from './useFetchApiKeys';

type SortDirection = 'asc' | 'desc';

const DEFAULT_SORT_FIELD: ApiKeySortField = 'created_at';
const DEFAULT_SORT_DIRECTION: SortDirection = 'desc';
const DEFAULT_PER_PAGE = 50;

export type UseApiKeysTableStateReturn = {
  response: APIKeyListResponse;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => void;
  filterData: ApiKeyFilterDataType;
  isKeyInactive: (key: APIKey) => boolean;
  localUsername: string;
  setLocalUsername: React.Dispatch<React.SetStateAction<string>>;
  page: number;
  perPage: number;
  sortField: ApiKeySortField;
  sortDirection: SortDirection;
  isFetching: boolean;
  onUsernameChange: (value: string) => void;
  onStatusToggle: (status: APIKeyDisplayStatus) => void;
  onStatusClear: (status: APIKeyDisplayStatus) => void;
  onSubscriptionChange: (subscription: string) => void;
  onSort: (field: ApiKeySortField, direction: SortDirection) => void;
  onSetPage: (newPage: number) => void;
  onPerPageSelect: (newPerPage: number, newPage: number) => void;
  onClearFilters: () => void;
};

export const useApiKeysTableState = (): UseApiKeysTableStateReturn => {
  const [filterData, setFilterData] = React.useState<ApiKeyFilterDataType>(initialApiKeyFilterData);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(DEFAULT_PER_PAGE);
  const [sortField, setSortField] = React.useState<ApiKeySortField>(DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(DEFAULT_SORT_DIRECTION);
  const [localUsername, setLocalUsername] = React.useState('');
  const [isFetching, setIsFetching] = React.useState(false);

  // The API has no concept of "inactive" — it only knows active | revoked | expired.
  // "Inactive" is a client-side display status for active keys whose subscription was
  // deleted.  When the user selects the "Inactive" filter we must still request
  // "active" keys from the server (they are the superset that includes inactive ones),
  // then narrow the results client-side via applyInactiveFilter.
  const apiFilterStatuses: APIKeyStatus[] = React.useMemo(() => {
    const hasInactive = filterData.statuses.includes('inactive');
    const result = filterData.statuses.filter((s): s is APIKeyStatus => s !== 'inactive');
    if (hasInactive && !result.includes('active')) {
      result.push('active');
    }
    return result;
  }, [filterData.statuses]);

  const searchRequest: APIKeySearchRequest = React.useMemo(
    () => ({
      filters: {
        ...(filterData.username && { username: filterData.username }),
        ...(apiFilterStatuses.length > 0 && { status: apiFilterStatuses }),
        ...(filterData.subscription && { subscription: filterData.subscription }),
      },
      sort: { by: sortField, order: sortDirection },
      pagination: { limit: perPage, offset: (page - 1) * perPage },
    }),
    [
      filterData.username,
      apiFilterStatuses,
      filterData.subscription,
      sortField,
      sortDirection,
      page,
      perPage,
    ],
  );

  const [rawResponse, loaded, error, refresh] = useFetchApiKeys(searchRequest);

  const isKeyInactive = React.useCallback(
    (key: APIKey): boolean => isKeyInactiveUtil(key, rawResponse.subscriptionDetails),
    [rawResponse.subscriptionDetails],
  );

  const { data: filteredData } = React.useMemo(
    () => applyInactiveFilter(rawResponse.data, filterData.statuses, isKeyInactive),
    [rawResponse.data, filterData.statuses, isKeyInactive],
  );

  const response = React.useMemo(
    (): APIKeyListResponse =>
      filteredData === rawResponse.data ? rawResponse : { ...rawResponse, data: filteredData },
    [rawResponse, filteredData],
  );

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

  const onStatusToggle = React.useCallback((status: APIKeyDisplayStatus) => {
    setFilterData((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }));
    setPage(1);
    setIsFetching(true);
  }, []);

  const onStatusClear = React.useCallback((status: APIKeyDisplayStatus) => {
    setFilterData((prev) => ({
      ...prev,
      statuses: prev.statuses.filter((s) => s !== status),
    }));
    setPage(1);
    setIsFetching(true);
  }, []);

  const onSubscriptionChange = React.useCallback(
    (subscription: string) => {
      if (filterData.subscription === subscription) {
        return;
      }
      setFilterData((prev) => ({ ...prev, subscription }));
      setPage(1);
      setIsFetching(true);
    },
    [filterData.subscription],
  );

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

  const onClearFilters = React.useCallback(() => {
    setFilterData(emptyApiKeyFilterData);
    setPage(1);
    setLocalUsername('');
    setIsFetching(true);
  }, []);

  return {
    response,
    loaded,
    error,
    refresh,
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
  };
};
