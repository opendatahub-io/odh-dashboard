import React from 'react';
import { Namespace, useNamespaceSelector } from 'mod-arch-core';
import useSyncPreferredNamespace from '~/app/hooks/useSyncPreferredNamespace';

type GenAiContextProps = {
  namespace: Namespace | undefined;
};

type GenAiContextProviderProps = {
  children: React.ReactNode;
  namespaceParam: string;
};

export const GenAiContext = React.createContext<GenAiContextProps>({
  namespace: undefined,
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

  const contextValue = React.useMemo(() => ({ namespace: foundNamespace }), [foundNamespace]);

  return <GenAiContext.Provider value={contextValue}>{children}</GenAiContext.Provider>;
};
