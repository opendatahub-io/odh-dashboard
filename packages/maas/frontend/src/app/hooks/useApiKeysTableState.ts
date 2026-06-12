import React from 'react';
import {
  APIKey,
  APIKeyStatus,
  APIKeySearchRequest,
  ApiKeyFilterDataType,
  initialApiKeyFilterData,
  emptyApiKeyFilterData,
  APIKeyListResponse,
} from '~/app/types/api-key';
import { ApiKeySortField } from '~/app/pages/keys-and-subs/apiKeys/allKeys/columns';
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
  localUsername: string;
  setLocalUsername: React.Dispatch<React.SetStateAction<string>>;
  page: number;
  perPage: number;
  sortField: ApiKeySortField;
  sortDirection: SortDirection;
  isFetching: boolean;
  onUsernameChange: (value: string) => void;
  onStatusToggle: (status: APIKeyStatus) => void;
  onStatusClear: (status: APIKeyStatus) => void;
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

  const serverStatuses = React.useMemo(() => {
    const hasInactive = filterData.statuses.includes('inactive');
    const result = filterData.statuses.filter((s) => s !== 'inactive');
    if (hasInactive && !result.includes('active')) {
      result.push('active');
    }
    return result;
  }, [filterData.statuses]);

  const searchRequest: APIKeySearchRequest = React.useMemo(
    () => ({
      filters: {
        ...(filterData.username && { username: filterData.username }),
        ...(serverStatuses.length > 0 && { status: serverStatuses }),
        ...(filterData.subscription && { subscription: filterData.subscription }),
      },
      sort: { by: sortField, order: sortDirection },
      pagination: { limit: perPage, offset: (page - 1) * perPage },
    }),
    [
      filterData.username,
      serverStatuses,
      filterData.subscription,
      sortField,
      sortDirection,
      page,
      perPage,
    ],
  );

  const [rawResponse, loaded, error, refresh] = useFetchApiKeys(searchRequest);

  const isKeyInactive = React.useCallback(
    (key: APIKey): boolean =>
      key.status === 'active' &&
      !!key.subscription &&
      rawResponse.subscriptionDetails != null &&
      !(key.subscription in rawResponse.subscriptionDetails),
    [rawResponse.subscriptionDetails],
  );

  const response = React.useMemo((): APIKeyListResponse => {
    const hasActive = filterData.statuses.includes('active');
    const hasInactive = filterData.statuses.includes('inactive');

    let { data } = rawResponse;

    if (hasActive !== hasInactive) {
      data = data.filter((key) => {
        if (key.status !== 'active') {
          return true;
        }
        return hasInactive ? isKeyInactive(key) : !isKeyInactive(key);
      });
    }

    if (hasActive && hasInactive) {
      data = data.toSorted((a, b) => {
        const aInactive = isKeyInactive(a) ? 1 : 0;
        const bInactive = isKeyInactive(b) ? 1 : 0;
        return aInactive - bInactive;
      });
    }

    if (data === rawResponse.data) {
      return rawResponse;
    }
    return { ...rawResponse, data };
  }, [rawResponse, filterData.statuses, isKeyInactive]);

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
