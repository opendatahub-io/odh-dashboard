import React from 'react';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import { AIModel, LlamaModel, LlamaStackDistributionModel, MaaSModel } from '~/app/types';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';
import useFetchAIModels from '~/app/hooks/useFetchAIModels';
import useFetchMaaSModels from '~/app/hooks/useFetchMaaSModels';

type ChatbotContextProps = {
  lsdStatus: LlamaStackDistributionModel | null;
  modelsLoaded: boolean;
  lsdStatusLoaded: boolean;
  aiModels: AIModel[];
  aiModelsLoaded: boolean;
  aiModelsError: Error | undefined;
  maasModels: MaaSModel[];
  maasModelsLoaded: boolean;
  maasModelsError: Error | undefined;
  models: LlamaModel[];
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
};

export const ChatbotContext = React.createContext<ChatbotContextProps>({
  lsdStatus: null,
  modelsLoaded: false,
  lsdStatusLoaded: false,
  aiModels: [],
  aiModelsLoaded: false,
  aiModelsError: undefined,
  maasModels: [],
  maasModelsLoaded: false,
  maasModelsError: undefined,
  models: [],
  modelsError: undefined,
  lsdStatusError: undefined,
  refresh: () => undefined,
  selectedModel: '',
  setSelectedModel: () => undefined,
  lastInput: '',
  setLastInput: () => undefined,
});

export const ChatbotContextProvider: React.FC<ChatbotContextProviderProps> = ({ children }) => {
  const [selectedModel, setSelectedModel] = React.useState('');
  const [lastInput, setLastInput] = React.useState('');
  const [activelyRefreshing, setActivelyRefreshing] = React.useState(true);
  const {
    data: lsdStatus,
    loaded: lsdStatusLoaded,
    error: lsdStatusError,
    refresh: lsdStatusRefresh,
  } = useFetchLSDStatus(activelyRefreshing);

  const { data: aiModels, loaded: aiModelsLoaded, error: aiModelsError } = useFetchAIModels();

  const {
    data: maasModels,
    loaded: maasModelsLoaded,
    error: maasModelsError,
  } = useFetchMaaSModels();

  const {
    data: models,
    loaded: modelsLoaded,
    error: modelsError,
    refresh: modelsRefresh,
  } = useFetchLlamaModels(lsdStatus?.phase !== 'Ready');

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
      lsdStatus,
      modelsLoaded,
      lsdStatusLoaded,
      aiModels,
      aiModelsLoaded,
      aiModelsError,
      maasModels,
      maasModelsLoaded,
      maasModelsError,
      models,
      modelsError,
      lsdStatusError,
      refresh,
      selectedModel,
      setSelectedModel,
      lastInput,
      setLastInput,
    }),
    [
      lsdStatus,
      lsdStatusLoaded,
      aiModels,
      aiModelsLoaded,
      aiModelsError,
      maasModels,
      maasModelsLoaded,
      maasModelsError,
      models,
      modelsLoaded,
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
