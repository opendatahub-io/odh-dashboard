import * as React from 'react';
// This CSS is imported directly here because federated consumers (e.g. AutoRAG)
// load this component via Module Federation without going through App.tsx,
// which is where the chatbot stylesheet is normally imported.
import '@patternfly/chatbot/dist/css/main.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ModularArchConfig,
  DeploymentMode,
  ModularArchContextProvider,
  NotificationContextProvider,
} from 'mod-arch-core';
import type { EmbeddableChatbotPlaygroundProps } from '~/types/embeddable-chatbot';
import { UserContextProvider } from '~/app/context/UserContext';
import { GenAiContext } from '~/app/context/GenAiContext';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { URL_PREFIX } from '~/app/utilities/const';
import ChatbotPlayground from './ChatbotPlayground';
import { EmbeddedMessagesContext } from './context/EmbeddedMessagesContext';
import { createChatbotConfigStore, ChatbotConfigStoreContext, DEFAULT_CONFIG_ID } from './store';

const modularArchConfig: ModularArchConfig = {
  deploymentMode: DeploymentMode.Federated,
  URL_PREFIX,
  BFF_API_VERSION: 'v1',
};

/**
 * Embeddable wrapper for the ChatbotPlayground component.
 * Provides all required context providers for use within Module Federation
 * consumers (e.g., AutoRAG's results page).
 *
 * Features are disabled by default; the host controls which features
 * are visible via the `features` prop.
 */
const EmbeddableChatbotPlayground: React.FC<EmbeddableChatbotPlaygroundProps> = ({
  namespace,
  secretName,
  responsesTemplate,
  // patternName is reserved for future use (e.g., display in header)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  patternName: _patternName,
  bffBasePath,
  welcomeContent,
  placeholderBotContent,
}) => {
  // Scoped QueryClient — not shared with the main app
  const queryClient = React.useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30000,
          },
        },
      }),
    [],
  );

  // Scoped Zustand store — does not share state with the singleton
  const scopedStore = React.useMemo(
    () =>
      createChatbotConfigStore({
        skipSessionStorage: true,
        initialConfig: {
          selectedModel: responsesTemplate.model,
          isStreamingEnabled: true,
        },
      }),
    [responsesTemplate.model],
  );

  // Stub ChatbotContext — synthesize minimal state from the template
  const stubChatbotContextValue = React.useMemo(
    () => ({
      lsdStatus: {
        phase: 'Ready' as const,
        name: '',
        version: '',
        distributionConfig: { activeDistribution: '', providers: [], availableDistributions: {} },
      },
      modelsLoaded: true,
      lsdStatusLoaded: true,
      aiModels: [],
      aiModelsLoaded: true,
      aiModelsError: undefined,
      maasModels: [],
      maasModelsLoaded: true,
      maasModelsError: undefined,
      models: responsesTemplate.model
        ? [
            {
              id: responsesTemplate.model,
              modelId: responsesTemplate.model,
              object: 'model',
              created: 0,
              owned_by: '', // eslint-disable-line camelcase
            },
          ]
        : [],
      modelsError: undefined,
      lsdStatusError: undefined,
      nemoGuardrailsStatus: null,
      nemoGuardrailsStatusLoaded: true,
      nemoGuardrailsStatusError: undefined,
      refresh: () => undefined,
      lastInput: '',
      setLastInput: () => undefined,
    }),
    [responsesTemplate.model],
  );

  // Stub GenAiContext — provide the namespace
  const stubGenAiContextValue = React.useMemo(
    () => ({
      // eslint-disable-next-line camelcase
      namespace: { name: namespace, display_name: namespace },
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      apiState: { apiAvailable: false, api: null as never },
      refreshAPIState: () => undefined,
    }),
    [namespace],
  );

  // Embedded messages config for passthrough flow
  const embeddedMessagesConfig = React.useMemo(
    () => ({
      bffBasePath,
      namespace,
      secretName,
      responsesTemplate,
    }),
    [bffBasePath, namespace, secretName, responsesTemplate],
  );

  // Dummy state for props ChatbotPlayground requires
  const [isViewCodeModalOpen, setIsViewCodeModalOpen] = React.useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = React.useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <ModularArchContextProvider config={modularArchConfig}>
        <NotificationContextProvider>
          <UserContextProvider>
            <GenAiContext.Provider value={stubGenAiContextValue}>
              <ChatbotContext.Provider value={stubChatbotContextValue}>
                <ChatbotConfigStoreContext.Provider value={scopedStore}>
                  <EmbeddedMessagesContext.Provider value={embeddedMessagesConfig}>
                    <ChatbotPlayground
                      isViewCodeModalOpen={isViewCodeModalOpen}
                      setIsViewCodeModalOpen={setIsViewCodeModalOpen}
                      isNewChatModalOpen={isNewChatModalOpen}
                      setIsNewChatModalOpen={setIsNewChatModalOpen}
                      activePaneConfigId={DEFAULT_CONFIG_ID}
                      welcomeContent={welcomeContent}
                      placeholderBotContent={placeholderBotContent}
                    />
                  </EmbeddedMessagesContext.Provider>
                </ChatbotConfigStoreContext.Provider>
              </ChatbotContext.Provider>
            </GenAiContext.Provider>
          </UserContextProvider>
        </NotificationContextProvider>
      </ModularArchContextProvider>
    </QueryClientProvider>
  );
};

export default EmbeddableChatbotPlayground;
