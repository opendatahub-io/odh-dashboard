import React from 'react';
import { APIKeyListResponse, APIKeySearchRequest } from '~/app/types/api-key';
import { useFetchApiKeys } from './useFetchApiKeys';

const DEFAULT_PER_PAGE = 5;

type UseSubscriptionApiKeysTableStateReturn = {
  response: APIKeyListResponse;
  loaded: boolean;
  refresh: () => void;
  page: number;
  perPage: number;
  isPageLoading: boolean;
  onSetPage: (newPage: number) => void;
  onPerPageSelect: (newPerPage: number, newPage: number) => void;
};

export const useSubscriptionApiKeysTableState = (
  subscriptionId: string,
): UseSubscriptionApiKeysTableStateReturn => {
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(DEFAULT_PER_PAGE);
  const [settledRequestKey, setSettledRequestKey] = React.useState('');

  const searchRequest: APIKeySearchRequest = React.useMemo(
    () => ({
      filters: { subscription: subscriptionId, status: ['active', 'expired'] },
      pagination: { limit: perPage, offset: (page - 1) * perPage },
    }),
    [subscriptionId, page, perPage],
  );

  const searchRequestKey = JSON.stringify(searchRequest);

  const [response, loaded, , refresh] = useFetchApiKeys(
    subscriptionId ? searchRequest : { pagination: { limit: 0, offset: 0 } },
  );

  React.useEffect(() => {
    setPage(1);
    setSettledRequestKey('');
  }, [subscriptionId]);

  React.useEffect(() => {
    if (loaded) {
      setSettledRequestKey(searchRequestKey);
    }
  }, [loaded, searchRequestKey]);

  const isPageLoading = loaded && settledRequestKey !== searchRequestKey;

  const onSetPage = React.useCallback((newPage: number) => {
    setPage(Math.max(1, newPage));
  }, []);

  const onPerPageSelect = React.useCallback((newPerPage: number, newPage: number) => {
    setPerPage(newPerPage);
    setPage(Math.max(1, newPage));
  }, []);

  return {
    response,
    loaded,
    refresh,
    page,
    perPage,
    isPageLoading,
    onSetPage,
    onPerPageSelect,
  };
};
