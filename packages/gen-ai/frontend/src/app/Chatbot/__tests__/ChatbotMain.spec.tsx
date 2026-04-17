import * as React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

let capturedPlaygroundProps: Record<string, unknown> = {};
jest.mock('~/app/Chatbot/ChatbotPlayground', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    capturedPlaygroundProps = props;
    return <div data-testid="chatbot-playground">Chatbot Playground</div>;
  },
}));

let capturedHeaderActionsProps: Record<string, unknown> = {};
jest.mock('~/app/Chatbot/ChatbotHeaderActions', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    capturedHeaderActionsProps = props;
    return <div data-testid="chatbot-header-actions">Header Actions</div>;
  },
}));

jest.mock('~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('~/app/Chatbot/components/DeletePlaygroundModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('~/app/Chatbot/components/ChatModal', () => ({
  __esModule: true,
  default: ({
    isOpen,
    onConfirm,
    onClose,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="compare-chat-modal">
        <button
          data-testid="confirm-compare-button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          Confirm
        </button>
      </div>
    ) : null,
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

const defaultStoreState = {
  configIds: ['default'],
  configurations: {
    default: {
      selectedModel: 'test-model',
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
  duplicateConfiguration: jest.fn(),
  removeConfiguration: jest.fn(),
};

const setupMockStore = (overrides: Partial<typeof defaultStoreState> = {}) => {
  const state = { ...defaultStoreState, ...overrides };
  mockUseChatbotConfigStore.mockImplementation((selector: unknown) => {
    if (typeof selector === 'function') {
      return selector(state);
    }
    return undefined;
  });
  (useChatbotConfigStore as unknown as { getState: () => typeof state }).getState = () => state;
};

const defaultChatbotContext = {
  lsdStatus: { phase: 'Ready' } as LlamaStackDistributionModel,
  modelsLoaded: true,
  lsdStatusLoaded: true,
  lsdStatusError: undefined,
  refresh: jest.fn(),
  aiModels: [{ id: 'test-model' }],
  aiModelsLoaded: true,
  aiModelsError: undefined,
  maasModels: [] as MaaSModel[],
  maasModelsLoaded: true,
  maasModelsError: undefined,
  models: [{ id: 'test-model' }],
  modelsError: undefined,
  lastInput: '',
  setLastInput: jest.fn(),
};

const defaultGenAiContext = {
  namespace: { name: 'test-namespace' } as Namespace,
  apiState: {
    apiAvailable: false,
    api: null as unknown as never,
  },
  refreshAPIState: jest.fn(),
};

const renderChatbotMain = (chatbotContextOverrides: Partial<typeof defaultChatbotContext> = {}) => {
  const chatbotContext = { ...defaultChatbotContext, ...chatbotContextOverrides };
  return render(
    <ChatbotContext.Provider value={chatbotContext}>
      <GenAiContext.Provider value={defaultGenAiContext}>
        <ChatbotMain />
      </GenAiContext.Provider>
    </ChatbotContext.Provider>,
  );
};

describe('ChatbotMain - Empty State Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedPlaygroundProps = {};
    capturedHeaderActionsProps = {};
    mockUseFetchBFFConfig.mockReturnValue({
      data: { isCustomLSD: false },
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    } as FetchStateObject<BFFConfig | null>);
    mockIsLlamaModelEnabled.mockReturnValue(true);

    setupMockStore();
  });

  it('should display empty state when no models are available in the project', () => {
    renderChatbotMain({
      modelsLoaded: false,
      aiModels: [],
      models: [],
    });

    expect(screen.getByTestId('no-models-empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('header-action')).not.toBeInTheDocument();
  });
});

describe('ChatbotMain - Compare Mode Modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedPlaygroundProps = {};
    capturedHeaderActionsProps = {};
    mockUseFetchBFFConfig.mockReturnValue({
      data: { isCustomLSD: false },
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    } as FetchStateObject<BFFConfig | null>);
    mockIsLlamaModelEnabled.mockReturnValue(true);

    setupMockStore();
  });

  it('should not show compare modal when no messages exist', () => {
    renderChatbotMain();

    const hasAnyMessagesRef = capturedPlaygroundProps.hasAnyMessagesRef as React.MutableRefObject<
      (() => boolean) | null
    >;
    hasAnyMessagesRef.current = () => false;

    const onCompareChat = capturedHeaderActionsProps.onCompareChat as () => void;
    act(() => {
      onCompareChat();
    });

    expect(screen.queryByTestId('compare-chat-modal')).not.toBeInTheDocument();
    expect(defaultStoreState.duplicateConfiguration).toHaveBeenCalled();
  });

  it('should show compare modal when messages exist', () => {
    renderChatbotMain();

    const hasAnyMessagesRef = capturedPlaygroundProps.hasAnyMessagesRef as React.MutableRefObject<
      (() => boolean) | null
    >;
    hasAnyMessagesRef.current = () => true;

    const onCompareChat = capturedHeaderActionsProps.onCompareChat as () => void;
    act(() => {
      onCompareChat();
    });

    expect(screen.getByTestId('compare-chat-modal')).toBeInTheDocument();
    expect(defaultStoreState.duplicateConfiguration).not.toHaveBeenCalled();
  });

  it('should enter compare mode after confirming modal when messages exist', () => {
    renderChatbotMain();

    const hasAnyMessagesRef = capturedPlaygroundProps.hasAnyMessagesRef as React.MutableRefObject<
      (() => boolean) | null
    >;
    hasAnyMessagesRef.current = () => true;

    const onCompareChat = capturedHeaderActionsProps.onCompareChat as () => void;
    act(() => {
      onCompareChat();
    });

    act(() => {
      fireEvent.click(screen.getByTestId('confirm-compare-button'));
    });

    expect(defaultStoreState.duplicateConfiguration).toHaveBeenCalled();
    expect(screen.queryByTestId('compare-chat-modal')).not.toBeInTheDocument();
  });
});
