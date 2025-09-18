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
    () => ({
      models,
      lsdStatus,
      modelsLoaded,
      lsdStatusLoaded,
      modelsError,
      lsdStatusError,
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
    ],
  );

  return <ChatbotContext.Provider value={contextValue}>{children}</ChatbotContext.Provider>;
};
