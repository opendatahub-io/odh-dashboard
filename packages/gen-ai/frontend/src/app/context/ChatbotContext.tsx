import React from 'react';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import {
  AIModel,
  LlamaModel,
  LlamaStackDistributionModel,
  NemoGuardrailsStatus,
} from '~/app/types';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';
import useFetchAIModels from '~/app/hooks/useFetchAIModels';
import useFetchNemoGuardrailsStatus from '~/app/hooks/useFetchNemoGuardrailsStatus';

type ChatbotContextProps = {
  lsdStatus: LlamaStackDistributionModel | null;
  modelsLoaded: boolean;
  lsdStatusLoaded: boolean;
  aiModels: AIModel[];
  aiModelsLoaded: boolean;
  aiModelsError: Error | undefined;
  maasModels: AIModel[];
  maasModelsLoaded: boolean;
  maasModelsError: Error | undefined;
  models: LlamaModel[];
  modelsError: Error | undefined;
  lsdStatusError: Error | undefined;
  nemoGuardrailsStatus: NemoGuardrailsStatus | null;
  nemoGuardrailsStatusLoaded: boolean;
  nemoGuardrailsStatusError: Error | undefined;
  refresh: () => void;
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
  nemoGuardrailsStatus: null,
  nemoGuardrailsStatusLoaded: false,
  nemoGuardrailsStatusError: undefined,
  refresh: () => undefined,
  lastInput: '',
  setLastInput: () => undefined,
});

export const ChatbotContextProvider: React.FC<ChatbotContextProviderProps> = ({ children }) => {
  const [lastInput, setLastInput] = React.useState('');
  const [activelyRefreshing, setActivelyRefreshing] = React.useState(true);
  const {
    data: lsdStatus,
    loaded: lsdStatusLoaded,
    error: lsdStatusError,
    refresh: lsdStatusRefresh,
  } = useFetchLSDStatus(activelyRefreshing);

  const {
    data: aiModels,
    loaded: aiModelsLoaded,
    error: aiModelsError,
    refresh: aiModelsRefresh,
  } = useFetchAIModels();

  const maasModels = React.useMemo(
    (): AIModel[] =>
      aiModels
        .filter((m) => m.model_source_type === 'maas')
        // Enrich with `id` so components that match by raw MaaS model identifier work correctly.
        .map((m): AIModel => ({ ...m, id: m.model_id })),
    [aiModels],
  );
  const maasModelsLoaded = aiModelsLoaded;
  const maasModelsError = aiModelsError;

  const {
    data: nemoGuardrailsStatus,
    loaded: nemoGuardrailsStatusLoaded,
    error: nemoGuardrailsStatusError,
    refresh: nemoGuardrailsStatusRefresh,
  } = useFetchNemoGuardrailsStatus();

  const {
    data: llamaModels,
    loaded: llamaModelsLoaded,
    error: llamaModelsError,
    refresh: modelsRefresh,
  } = useFetchLlamaModels(lsdStatus?.phase !== 'Ready');

  const models = React.useMemo(
    (): LlamaModel[] =>
      llamaModels.length > 0
        ? llamaModels
        : maasModels.map((model) => ({
            id: model.model_id,
            modelId: model.model_id,
            object: 'model',
            created: 0,
            // eslint-disable-next-line camelcase
            owned_by: 'maas',
          })),
    [llamaModels, maasModels],
  );
  const modelsLoaded = llamaModelsLoaded || maasModelsLoaded;
  const modelsError = llamaModelsError || maasModelsError;

  const refresh = React.useCallback(() => {
    lsdStatusRefresh();
    aiModelsRefresh();
    modelsRefresh();
    nemoGuardrailsStatusRefresh();
  }, [aiModelsRefresh, lsdStatusRefresh, modelsRefresh, nemoGuardrailsStatusRefresh]);

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
      nemoGuardrailsStatus,
      nemoGuardrailsStatusLoaded,
      nemoGuardrailsStatusError,
      refresh,
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
      nemoGuardrailsStatus,
      nemoGuardrailsStatusLoaded,
      nemoGuardrailsStatusError,
      lastInput,
      setLastInput,
      refresh,
    ],
  );

  return <ChatbotContext.Provider value={contextValue}>{children}</ChatbotContext.Provider>;
};
