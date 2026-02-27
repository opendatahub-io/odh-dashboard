import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type { FetchStateObject, Namespace } from 'mod-arch-core';
import { ChatbotMain } from '~/app/Chatbot/ChatbotMain';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { GenAiContext } from '~/app/context/GenAiContext';
import { useChatbotConfigStore } from '~/app/Chatbot/store';
import { isLlamaModelEnabled } from '~/app/utilities';
import useFetchBFFConfig from '~/app/hooks/useFetchBFFConfig';
import type { BFFConfig, LlamaStackDistributionModel } from '~/app/types';
import { MaaSModel } from '~/app/types';

// Mock dependencies
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock('~/app/hooks/useFetchBFFConfig');
jest.mock('~/app/utilities');
jest.mock('~/app/Chatbot/store', () => ({
  ...jest.requireActual('~/app/Chatbot/store'),
  useChatbotConfigStore: jest.fn(),
}));
jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
  fireSimpleTrackingEvent: jest.fn(),
}));

// Mock child components
jest.mock('~/app/Chatbot/ChatbotHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="chatbot-header">Chatbot Header</div>,
}));

jest.mock('~/app/Chatbot/ChatbotPlayground', () => ({
  __esModule: true,
  default: () => <div data-testid="chatbot-playground">Chatbot Playground</div>,
}));

jest.mock('~/app/Chatbot/ChatbotHeaderActions', () => ({
  __esModule: true,
  default: () => <div data-testid="chatbot-header-actions">Header Actions</div>,
}));

jest.mock('~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('~/app/Chatbot/components/DeletePlaygroundModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('~/app/Chatbot/components/CompareChatModal', () => ({
  __esModule: true,
  default: () => null,
}));

type ApplicationsPageProps = {
  children?: React.ReactNode;
  emptyStatePage?: React.ReactNode;
  headerAction?: React.ReactNode;
};

jest.mock('mod-arch-shared', () => ({
  ApplicationsPage: ({ children, emptyStatePage, headerAction }: ApplicationsPageProps) => (
    <div data-testid="applications-page">
      {emptyStatePage && <div data-testid="empty-state-page">{emptyStatePage}</div>}
      {headerAction && <div data-testid="header-action">{headerAction}</div>}
      {children}
    </div>
  ),
}));

jest.mock('~/app/EmptyStates/NoData', () => ({
  __esModule: true,
  default: ({ title, 'data-testid': dataTestId }: { title: string; 'data-testid'?: string }) => (
    <div data-testid={dataTestId || 'chatbot-empty-state'}>
      <div data-testid="empty-state-title">{title}</div>
    </div>
  ),
}));

const mockUseChatbotConfigStore = useChatbotConfigStore as jest.MockedFunction<
  typeof useChatbotConfigStore
>;
const mockIsLlamaModelEnabled = isLlamaModelEnabled as jest.MockedFunction<
  typeof isLlamaModelEnabled
>;
const mockUseFetchBFFConfig = useFetchBFFConfig as jest.MockedFunction<typeof useFetchBFFConfig>;

describe('ChatbotMain - Empty State Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchBFFConfig.mockReturnValue({
      data: { isCustomLSD: false },
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    } as FetchStateObject<BFFConfig | null>);
    mockIsLlamaModelEnabled.mockReturnValue(true);

    // Simple mock that returns values based on selector
    mockUseChatbotConfigStore.mockImplementation((selector: unknown) => {
      if (typeof selector === 'function') {
        return selector({
          configIds: ['default'],
          configurations: {
            default: {
              selectedModel: '',
              systemInstruction: '',
              temperature: 0.1,
              isStreamingEnabled: true,
              selectedMcpServerIds: [],
              mcpToolSelections: {},
              guardrail: '',
              guardrailUserInputEnabled: false,
              guardrailModelOutputEnabled: false,
              isRagEnabled: false,
            },
          },
        });
      }
      return undefined;
    });
  });

  it('should display empty state when no models are available in the project', () => {
    const chatbotContext = {
      lsdStatus: { phase: 'Ready' } as LlamaStackDistributionModel,
      modelsLoaded: false,
      lsdStatusLoaded: true,
      lsdStatusError: undefined,
      refresh: jest.fn(),
      aiModels: [],
      aiModelsLoaded: true,
      aiModelsError: undefined,
      maasModels: [] as MaaSModel[],
      maasModelsLoaded: true,
      maasModelsError: undefined,
      models: [],
      modelsError: undefined,
      lastInput: '',
      setLastInput: jest.fn(),
    };

    const genAiContext = {
      namespace: { name: 'test-namespace' } as Namespace,
      apiState: {
        apiAvailable: false,
        api: null as unknown as never,
      },
      refreshAPIState: jest.fn(),
    };

    render(
      <ChatbotContext.Provider value={chatbotContext}>
        <GenAiContext.Provider value={genAiContext}>
          <ChatbotMain />
        </GenAiContext.Provider>
      </ChatbotContext.Provider>,
    );

    expect(screen.getByTestId('no-models-empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('header-action')).not.toBeInTheDocument();
  });
});
