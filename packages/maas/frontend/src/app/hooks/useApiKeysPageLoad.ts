import React from 'react';
import { useFetchApiKeys } from '~/app/hooks/useFetchApiKeys';
import { useIsMaasAdmin } from '~/app/hooks/useIsMaasAdmin';
import { useApiKeyConfig } from '~/app/hooks/useApiKeyConfig';
import {
  useApiKeysTableState,
  type UseApiKeysTableStateReturn,
} from '~/app/hooks/useApiKeysTableState';
import { APIKeySearchRequest } from '~/app/types/api-key';

const EXISTENCE_CHECK_REQUEST: APIKeySearchRequest = { pagination: { limit: 1, offset: 0 } };

export type UseApiKeysPageLoadReturn = UseApiKeysTableStateReturn & {
  isMaasAdmin: boolean;
  isMaasAdminLoaded: boolean;
  maxExpirationDays: number;
  apiKeyConfigLoaded: boolean;
  apiKeyConfigError: Error | undefined;
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
  const [apiKeyConfig, apiKeyConfigLoaded, apiKeyConfigError, refreshApiKeyConfig] =
    useApiKeyConfig();

  // Config failures must not block listing/revoking; the create modal surfaces them.
  // Do not wait on api-key config — it is only needed when creating a key.
  const loadError = tableState.error ?? existenceError ?? isMaasAdminError;

  const hasAnyApiKeys = tableState.response.data.length > 0 || existenceResponse.data.length > 0;

  const loaded =
    isMaasAdminLoaded && tableState.loaded && (existenceLoaded || !!existenceError) && !loadError;

  const refreshAll = React.useCallback(() => {
    tableState.refresh();
    refreshExistence();
    refreshApiKeyConfig();
  }, [tableState, refreshExistence, refreshApiKeyConfig]);

  return {
    ...tableState,
    isMaasAdmin,
    isMaasAdminLoaded,
    maxExpirationDays: apiKeyConfig.max_expiration_days,
    apiKeyConfigLoaded,
    apiKeyConfigError,
    loadError,
    loaded,
    hasAnyApiKeys,
    existenceLoaded,
    refreshAll,
  };
};
