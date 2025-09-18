import React from 'react';
import { Namespace } from 'mod-arch-core';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import { LlamaModel, LlamaStackDistributionModel } from '~/app/types';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';

type ChatbotContextProps = {
  models: LlamaModel[];
  lsdStatus: LlamaStackDistributionModel | null;
  modelsLoaded: boolean;
  lsdStatusLoaded: boolean;
  modelsError: Error | undefined;
  lsdStatusError: Error | undefined;
};

type ChatbotContextProviderProps = {
  children: React.ReactNode;
  namespace: Namespace | undefined;
};

export const ChatbotContext = React.createContext<ChatbotContextProps>({
  models: [],
  lsdStatus: null,
  modelsLoaded: false,
  lsdStatusLoaded: false,
  modelsError: undefined,
  lsdStatusError: undefined,
});

export const ChatbotContextProvider: React.FC<ChatbotContextProviderProps> = ({
  children,
  namespace,
}) => {
  const {
    data: models,
    loaded: modelsLoaded,
    error: modelsError,
  } = useFetchLlamaModels(namespace?.name);
  const {
    data: lsdStatus,
    loaded: lsdStatusLoaded,
    error: lsdStatusError,
  } = useFetchLSDStatus(namespace?.name);

  const contextValue = React.useMemo(
    () => ({ models, lsdStatus, modelsLoaded, lsdStatusLoaded, modelsError, lsdStatusError }),
    [models, lsdStatus, modelsLoaded, lsdStatusLoaded, modelsError, lsdStatusError],
  );

  return <ChatbotContext.Provider value={contextValue}>{children}</ChatbotContext.Provider>;
};
