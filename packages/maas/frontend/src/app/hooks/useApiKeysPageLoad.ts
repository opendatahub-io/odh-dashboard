import React from 'react';
import { useFetchApiKeys } from '~/app/hooks/useFetchApiKeys';
import { useIsMaasAdmin } from '~/app/hooks/useIsMaasAdmin';
import {
  useApiKeysTableState,
  type UseApiKeysTableStateReturn,
} from '~/app/hooks/useApiKeysTableState';
import { APIKeySearchRequest } from '~/app/types/api-key';

const EXISTENCE_CHECK_REQUEST: APIKeySearchRequest = { pagination: { limit: 1, offset: 0 } };

export type UseApiKeysPageLoadReturn = UseApiKeysTableStateReturn & {
  isMaasAdmin: boolean;
  isMaasAdminLoaded: boolean;
  loadError: Error | undefined;
  loaded: boolean;
  hasAnyApiKeys: boolean;
  existenceLoaded: boolean;
  refreshAll: () => void;
};

export const useApiKeysPageLoad = (): UseApiKeysPageLoadReturn => {
  const [isMaasAdmin, isMaasAdminLoaded, isMaasAdminError] = useIsMaasAdmin();
  const tableState = useApiKeysTableState();
  const [existenceResponse, existenceLoaded, existenceError, refreshExistence] =
    useFetchApiKeys(EXISTENCE_CHECK_REQUEST);

  const loadError = tableState.error ?? existenceError ?? isMaasAdminError;

  const hasAnyApiKeys = tableState.response.data.length > 0 || existenceResponse.data.length > 0;

  const loaded =
    isMaasAdminLoaded && tableState.loaded && (existenceLoaded || !!existenceError) && !loadError;

  const refreshAll = React.useCallback(() => {
    tableState.refresh();
    refreshExistence();
  }, [tableState, refreshExistence]);

  return {
    ...tableState,
    isMaasAdmin,
    isMaasAdminLoaded,
    loadError,
    loaded,
    hasAnyApiKeys,
    existenceLoaded,
    refreshAll,
  };
};
