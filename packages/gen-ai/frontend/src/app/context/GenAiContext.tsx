import React from 'react';
import {
  BrowserStorageContextProvider,
  Namespace,
  useNamespaceSelector,
  useQueryParamNamespaces,
} from 'mod-arch-core';
import useSyncPreferredNamespace from '~/app/hooks/useSyncPreferredNamespace';
import useGenAiAPIState, { GenAiAPIState } from '~/app/hooks/useGenAiAPIState';
import { URL_PREFIX } from '~/app/utilities';
import { GenAiAPIs } from '~/app/types';
import { MCPSelectionProvider } from './MCPContextProvider';

type GenAiContextProps = {
  namespace: Namespace | undefined;
  apiState: GenAiAPIState;
  refreshAPIState: () => void;
};

type GenAiContextProviderProps = {
  children: React.ReactNode;
  namespaceParam: string;
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
  const { namespaces } = useNamespaceSelector();
  const foundNamespace = React.useMemo(
    () => namespaces.find((n) => n.name === namespaceParam),
    [namespaces, namespaceParam],
  );
  useSyncPreferredNamespace(foundNamespace);

  const queryParams = useQueryParamNamespaces();

  const [apiState, refreshAPIState] = useGenAiAPIState(`${URL_PREFIX}/api/v1`, queryParams);

  const contextValue = React.useMemo(
    () => ({ namespace: foundNamespace, apiState, refreshAPIState }),
    [foundNamespace, apiState, refreshAPIState],
  );

  return (
    <GenAiContext.Provider value={contextValue}>
      <BrowserStorageContextProvider>
        <MCPSelectionProvider>{children}</MCPSelectionProvider>
      </BrowserStorageContextProvider>
    </GenAiContext.Provider>
  );
};
