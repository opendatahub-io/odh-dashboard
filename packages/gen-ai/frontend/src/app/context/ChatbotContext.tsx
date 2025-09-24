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
  refresh: () => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  lastInput: string;
  setLastInput: (input: string) => void;
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
  refresh: () => undefined,
  selectedModel: '',
  setSelectedModel: () => undefined,
  lastInput: '',
  setLastInput: () => undefined,
});

export const ChatbotContextProvider: React.FC<ChatbotContextProviderProps> = ({
  children,
  namespace,
}) => {
  const [selectedModel, setSelectedModel] = React.useState('');
  const [lastInput, setLastInput] = React.useState('');
  const [activelyRefreshing, setActivelyRefreshing] = React.useState(true);
  const {
    data: lsdStatus,
    loaded: lsdStatusLoaded,
    error: lsdStatusError,
    refresh: lsdStatusRefresh,
  } = useFetchLSDStatus(namespace?.name, activelyRefreshing);

  const {
    data: models,
    loaded: modelsLoaded,
    error: modelsError,
    refresh: modelsRefresh,
  } = useFetchLlamaModels(namespace?.name, lsdStatus?.phase !== 'Ready');

  const refresh = React.useCallback(() => {
    lsdStatusRefresh();
    modelsRefresh();
  }, [lsdStatusRefresh, modelsRefresh]);

  // Set activeRefresh to false when the component unmounts
  React.useEffect(() => {
    if (!lsdStatus || lsdStatus.phase !== 'Initializing') {
      setActivelyRefreshing(false);
    } else {
      setActivelyRefreshing(true);
    }
    return () => {
      setActivelyRefreshing(false);
    };
  }, [lsdStatus]);

  const contextValue = React.useMemo(
    () => ({
      models,
      lsdStatus,
      modelsLoaded,
      lsdStatusLoaded,
      modelsError,
      lsdStatusError,
      refresh,
      selectedModel,
      setSelectedModel,
      lastInput,
      setLastInput,
    }),
    [
      models,
      lsdStatus,
      modelsLoaded,
      lsdStatusLoaded,
      modelsError,
      lsdStatusError,
      selectedModel,
      lastInput,
      setLastInput,
      refresh,
    ],
  );

  return <ChatbotContext.Provider value={contextValue}>{children}</ChatbotContext.Provider>;
};
