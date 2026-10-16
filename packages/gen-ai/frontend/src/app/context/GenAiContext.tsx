import React from 'react';
import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { BrowserStorageContextProvider, Namespace, useQueryParamNamespaces } from 'mod-arch-core';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import useSyncPreferredNamespace from '~/app/hooks/useSyncPreferredNamespace';
import useGenAiAPIState, { GenAiAPIState } from '~/app/hooks/useGenAiAPIState';
import { API_URL_PREFIX } from '~/app/utilities';
import { GenAiAPIs } from '~/app/types';
import { GRID } from '~/odh/extensions';

type GenAiContextProps = {
  namespace: Namespace | undefined;
  apiState: GenAiAPIState;
  refreshAPIState: () => void;
};

type GenAiContextProviderProps = {
  children: React.ReactNode;
  namespaceParam?: string;
};

export const GenAiContext = React.createContext<GenAiContextProps>({
  namespace: undefined,
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  apiState: { apiAvailable: false, api: null as unknown as GenAiAPIs },
  refreshAPIState: () => undefined,
});

export const GenAiContextProvider: React.FC<GenAiContextProviderProps> = ({
  children,
  namespaceParam,
}) => {
  const { namespaces } = useNamespaceSelectorWithPersistence();
  const foundNamespace = React.useMemo(
    () => namespaces.find((n) => n.name === namespaceParam),
    [namespaces, namespaceParam],
  );
  useSyncPreferredNamespace(foundNamespace);

  const queryParams = useQueryParamNamespaces();
  const [maasConsumerPortalEnabled] = useFeatureFlag(GRID);

  const apiBasePath = maasConsumerPortalEnabled
    ? `${process.env.BASE_PATH || ''}/maas-consumer/api/v1`
    : `${API_URL_PREFIX}/api/v1`;
  const [apiState, refreshAPIState] = useGenAiAPIState(apiBasePath, queryParams);

  const contextValue = React.useMemo(
    () => ({ namespace: foundNamespace, apiState, refreshAPIState }),
    [foundNamespace, apiState, refreshAPIState],
  );

  return (
    <GenAiContext.Provider value={contextValue}>
      <BrowserStorageContextProvider>{children}</BrowserStorageContextProvider>
    </GenAiContext.Provider>
  );
};
