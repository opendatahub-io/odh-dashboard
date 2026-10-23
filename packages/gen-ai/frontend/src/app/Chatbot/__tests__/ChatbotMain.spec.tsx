import * as React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { FetchStateObject, Namespace } from 'mod-arch-core';
import { ChatbotMain } from '~/app/Chatbot/ChatbotMain';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { GenAiContext } from '~/app/context/GenAiContext';
import { useChatbotConfigStore, DEFAULT_CONFIGURATION } from '~/app/Chatbot/store';
import { isLlamaModelEnabled } from '~/app/utilities';
import useFetchBFFConfig from '~/app/hooks/useFetchBFFConfig';
import useGenAiAgentDeploymentEnabled from '~/app/hooks/useGenAiAgentDeploymentEnabled';
import useFetchMCPServers from '~/app/hooks/useFetchMCPServers';
import useMCPServerStatuses from '~/app/hooks/useMCPServerStatuses';
import { useSafeBrowserUnloadBlocker } from '~/app/hooks/useSafeBrowserUnloadBlocker';
import SafeNavigationBlocker from '~/app/components/SafeNavigationBlocker';
import ChatbotPlayground from '~/app/Chatbot/ChatbotPlayground';
import SaveAgentProfileModal from '~/app/Chatbot/components/SaveAgentProfileModal';
import ChatModal from '~/app/Chatbot/components/ChatModal';
import type {
  AAModelResponse,
  AIModel,
  BFFConfig,
  LlamaStackDistributionModel,
  MCPServerFromAPI,
} from '~/app/types';

// Mock dependencies
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
}));

jest.mock('~/app/hooks/useFetchBFFConfig');
jest.mock('~/app/hooks/useGenAiAgentDeploymentEnabled');
jest.mock('~/app/hooks/useFetchMCPServers');
jest.mock('~/app/hooks/useMCPServerStatuses');
jest.mock('~/app/utilities');
jest.mock('~/app/Chatbot/store', () => ({
  ...jest.requireActual('~/app/Chatbot/store'),
  useChatbotConfigStore: jest.fn(),
}));
jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
  fireSimpleTrackingEvent: jest.fn(),
}));
jest.mock('~/app/hooks/useChatPlaygroundEnabled', () => ({
  __esModule: true,
  default: () => true,
}));

jest.mock('~/app/components/SafeNavigationBlocker', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('~/app/hooks/useSafeBrowserUnloadBlocker', () => ({
  useSafeBrowserUnloadBlocker: jest.fn(),
}));

// Mock child components
jest.mock('~/app/Chatbot/ChatbotHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="chatbot-header">Chatbot Header</div>,
}));

jest.mock('~/app/Chatbot/ChatbotPlayground', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="chatbot-playground">Chatbot Playground</div>),
}));

jest.mock('~/app/Chatbot/components/SaveAgentProfileModal', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="save-agent-profile-modal" />),
}));

jest.mock('~/app/Chatbot/ChatbotHeaderActions', () => ({
  __esModule: true,
  default: () => <div data-testid="chatbot-header-actions">Header Actions</div>,
}));

jest.mock('~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal', () => ({
  __esModule: true,
  default: ({ onUpdateInitiated }: { onUpdateInitiated?: () => void }) =>
    onUpdateInitiated ? (
      <button type="button" data-testid="mock-update-initiated-button" onClick={onUpdateInitiated}>
        Trigger update
      </button>
    ) : null,
}));

jest.mock('~/app/Chatbot/components/DeletePlaygroundModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('~/app/Chatbot/components/ChatModal', () => ({
  __esModule: true,
  default: jest.fn(() => null),
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
  default: ({
    title,
    'data-testid': dataTestId,
    handleActionButtonClick,
  }: {
    title: string;
    'data-testid'?: string;
    handleActionButtonClick?: () => void;
  }) => (
    <div data-testid={dataTestId || 'chatbot-empty-state'}>
      <div data-testid="empty-state-title">{title}</div>
      {handleActionButtonClick && (
        <button
          type="button"
          data-testid="empty-state-action-button"
          onClick={handleActionButtonClick}
        >
          Action
        </button>
      )}
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
const mockUseGenAiAgentDeploymentEnabled = jest.mocked(useGenAiAgentDeploymentEnabled);
const mockUseFetchMCPServers = jest.mocked(useFetchMCPServers);
const mockUseMCPServerStatuses = jest.mocked(useMCPServerStatuses);
const mockChatbotPlayground = jest.mocked(ChatbotPlayground);
const mockSaveAgentProfileModal = jest.mocked(SaveAgentProfileModal);

const connectedMcpServer: MCPServerFromAPI = {
  name: 'connected-server',
  url: 'https://connected.example.com/mcp',
  transport: 'streamable-http',
  description: '',
  logo: null,
  status: 'healthy',
  version: '1.0.0',
  source: 'registry',
  tools: [],
  // eslint-disable-next-line camelcase
  tool_count: 0,
};

const unreachableMcpServer: MCPServerFromAPI = {
  name: 'unreachable-server',
  url: 'https://unreachable.example.com/mcp',
  transport: 'streamable-http',
  description: '',
  logo: null,
  status: 'healthy',
  version: '1.0.0',
  source: 'registry',
  tools: [],
  // eslint-disable-next-line camelcase
  tool_count: 0,
};

describe('ChatbotMain - Empty State Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchBFFConfig.mockReturnValue({
      data: { isCustomLSD: false, sandboxesAvailable: true },
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    } as FetchStateObject<BFFConfig | null>);
    mockUseGenAiAgentDeploymentEnabled.mockReturnValue({ enabled: false, loaded: true });
    mockIsLlamaModelEnabled.mockReturnValue(true);
    mockUseFetchMCPServers.mockReturnValue({
      data: [],
      configMapName: null,
      registryAvailable: false,
      loaded: true,
      error: undefined,
      refetch: jest.fn(),
    });
    mockUseMCPServerStatuses.mockReturnValue({
      serverStatuses: new Map(),
      statusesLoading: new Set(),
      checkServerStatus: jest.fn(),
    });

    // Simple mock that returns values based on selector
    mockUseChatbotConfigStore.mockImplementation((selector: unknown) => {
      if (typeof selector === 'function') {
        return selector({
          configIds: ['default'],
          configurations: {
            default: { ...DEFAULT_CONFIGURATION },
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
      maasModels: [] as AAModelResponse[],
      maasModelsLoaded: true,
      maasModelsError: undefined,
      models: [],
      modelsError: undefined,
      nemoGuardrailsStatus: null,
      nemoGuardrailsStatusLoaded: true,
      nemoGuardrailsStatusError: undefined,
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

  it('should omit unreachable MCP servers when saving an agent profile', () => {
    let temperature = 0.1;
    let selectedModel = '';
    let knowledgeMode: 'inline' | 'external' = 'inline';
    let selectedVectorStoreId = 'inline-store';
    mockUseChatbotConfigStore.getState =
      jest.requireActual<typeof import('~/app/Chatbot/store')>(
        '~/app/Chatbot/store',
      ).useChatbotConfigStore.getState;
    mockUseChatbotConfigStore.mockImplementation((selector: unknown) =>
      typeof selector === 'function'
        ? selector({
            configIds: ['default'],
            profileApplied: false,
            configurations: {
              default: {
                ...DEFAULT_CONFIGURATION,
                selectedModel,
                knowledgeMode,
                selectedVectorStoreId,
                temperature,
              },
            },
          })
        : undefined,
    );
    mockUseFetchMCPServers.mockReturnValue({
      data: [connectedMcpServer, unreachableMcpServer],
      configMapName: 'mcp-servers',
      registryAvailable: true,
      loaded: true,
      error: undefined,
      refetch: jest.fn(),
    });
    mockUseMCPServerStatuses.mockReturnValue({
      serverStatuses: new Map([
        [connectedMcpServer.url, { status: 'connected', message: 'Connected' }],
        [unreachableMcpServer.url, { status: 'unreachable', message: 'Server unreachable' }],
      ]),
      statusesLoading: new Set(),
      checkServerStatus: jest.fn(),
    });

    const renderMain = () => (
      <ChatbotContext.Provider
        value={{
          lsdStatus: { phase: 'Ready', tracingEnabled: false } as LlamaStackDistributionModel,
          modelsLoaded: true,
          lsdStatusLoaded: true,
          lsdStatusError: undefined,
          refresh: jest.fn(),
          aiModels: [],
          aiModelsLoaded: true,
          aiModelsError: undefined,
          maasModels: [] as AAModelResponse[],
          maasModelsLoaded: true,
          maasModelsError: undefined,
          models: [
            // eslint-disable-next-line camelcase
            { id: 'test-model', modelId: 'test-model', object: 'model', created: 0, owned_by: '' },
          ],
          modelsError: undefined,
          nemoGuardrailsStatus: null,
          nemoGuardrailsStatusLoaded: true,
          nemoGuardrailsStatusError: undefined,
          lastInput: '',
          setLastInput: jest.fn(),
        }}
      >
        <GenAiContext.Provider
          value={{
            namespace: { name: 'test-namespace' } as Namespace,
            apiState: { apiAvailable: false, api: null as never },
            refreshAPIState: jest.fn(),
          }}
        >
          <ChatbotMain />
        </GenAiContext.Provider>
      </ChatbotContext.Provider>
    );
    const { rerender, unmount } = render(renderMain());

    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    act(() => mockChatbotPlayground.mock.calls.at(-1)?.[0].onRevertToDefaults?.('default'));
    expect(useChatbotConfigStore.getState().configurations.default?.selectedModel).toBe('');
    selectedModel = 'test-model';
    rerender(renderMain());
    // An already-initialized configuration without a baseline is adopted as the
    // baseline — retained settings are not flagged as dirty
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    selectedModel = '';
    rerender(renderMain());
    act(() => mockChatbotPlayground.mock.calls.at(-1)?.[0].onInitialModelSelected?.('test-model'));
    selectedModel = 'test-model';
    rerender(renderMain());
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    selectedModel = 'another-model';
    rerender(renderMain());
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(true);
    selectedModel = 'test-model';
    knowledgeMode = 'external';
    selectedVectorStoreId = 'external-store';
    rerender(renderMain());
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(true);
    knowledgeMode = 'inline';
    selectedVectorStoreId = 'inline-store';
    temperature = 0.5;
    rerender(renderMain());

    const playgroundProps = mockChatbotPlayground.mock.calls.at(-1)?.[0];
    expect(playgroundProps).toEqual(expect.objectContaining({ mcpServers: [connectedMcpServer] }));
    expect(playgroundProps?.isDefaultConfigDirty).toBe(true);
    act(() => playgroundProps?.setActivePaneConfigId?.('other-config'));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].activePaneConfigId).toBe('other-config');
    act(() => playgroundProps?.onRevertToDefaults?.('default'));
    // Reverting one pane keeps the active pane — compare mode is not collapsed
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].activePaneConfigId).toBe('other-config');
    expect(useChatbotConfigStore.getState().configurations.default).toEqual({
      ...DEFAULT_CONFIGURATION,
      selectedModel: 'test-model',
    });
    act(() => {
      playgroundProps?.onOpenSave?.();
    });
    act(() => playgroundProps?.onClearAgent?.());
    expect(useChatbotConfigStore.getState().configurations.default?.selectedModel).toBe('');

    expect(mockSaveAgentProfileModal).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mcpServers: [connectedMcpServer],
        isMcpServerStatusCheckComplete: true,
      }),
      expect.anything(),
    );

    unmount();
    const actualStore =
      jest.requireActual<typeof import('~/app/Chatbot/store')>(
        '~/app/Chatbot/store',
      ).useChatbotConfigStore;
    mockUseChatbotConfigStore.mockImplementation(actualStore);
    act(() => actualStore.getState().resetConfiguration());
    render(renderMain());
    act(() => mockChatbotPlayground.mock.calls.at(-1)?.[0].onInitialModelSelected?.('test-model'));
    act(() => actualStore.getState().updateSelectedModel('default', 'test-model'));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    act(() => actualStore.getState().updateTemperature('default', 0.5));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(true);
    act(() => mockChatbotPlayground.mock.calls.at(-1)?.[0].onRevertToDefaults?.('default'));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    act(() => actualStore.getState().updateGuardrail('default', 'test-model'));
    act(() => actualStore.getState().updateGuardrailModelOutputEnabled('default', true));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(true);
    act(() => mockChatbotPlayground.mock.calls.at(-1)?.[0].onRevertToDefaults?.('default'));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    act(() => actualStore.getState().updateGuardrail('default', 'test-model'));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    act(() => actualStore.getState().updateGuardrail('default', 'other-model'));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(true);
    act(() => mockChatbotPlayground.mock.calls.at(-1)?.[0].onRevertToDefaults?.('default'));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    act(() => actualStore.getState().updateGuardrail('default', 'test-model'));
    act(() => actualStore.getState().updateGuardrailUserInputEnabled('default', true));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(true);
    act(() => mockChatbotPlayground.mock.calls.at(-1)?.[0].onRevertToDefaults?.('default'));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    mockUseFetchBFFConfig.mockReturnValue({ data: null } as FetchStateObject<BFFConfig | null>);
    act(() => actualStore.getState().updateGuardrail('default', 'test-model'));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);

    // Initialized settings (route-provided MCP servers) are part of the baseline — not dirty
    act(() => actualStore.getState().resetConfiguration({ selectedMcpServerIds: ['server-1'] }));
    act(() => mockChatbotPlayground.mock.calls.at(-1)?.[0].onInitialModelSelected?.('test-model'));
    act(() => actualStore.getState().updateSelectedModel('default', 'test-model'));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    // Revert restores the effective starting configuration, not raw defaults
    act(() => actualStore.getState().updateTemperature('default', 0.5));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(true);
    act(() => mockChatbotPlayground.mock.calls.at(-1)?.[0].onRevertToDefaults?.('default'));
    expect(useChatbotConfigStore.getState().configurations.default?.selectedMcpServerIds).toEqual([
      'server-1',
    ]);
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    // Edits to the compare-mode secondary pane still trip the navigation guard
    act(() => jest.mocked(ChatModal).mock.calls.at(-1)?.[0].onConfirm());
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    const secondaryConfigId = useChatbotConfigStore.getState().configIds[1];
    act(() => actualStore.getState().updateTemperature(secondaryConfigId, 0.9));
    expect(jest.mocked(useSafeBrowserUnloadBlocker)).toHaveBeenLastCalledWith(true);
    act(() => actualStore.getState().resetConfiguration());
  });

  const renderWithActualStore = (maasModels: AIModel[]) => {
    const actualStore =
      jest.requireActual<typeof import('~/app/Chatbot/store')>(
        '~/app/Chatbot/store',
      ).useChatbotConfigStore;
    mockUseChatbotConfigStore.getState = actualStore.getState;
    mockUseChatbotConfigStore.mockImplementation(actualStore);
    act(() => actualStore.getState().resetConfiguration());
    render(
      <ChatbotContext.Provider
        value={{
          lsdStatus: { phase: 'Ready', tracingEnabled: false } as LlamaStackDistributionModel,
          modelsLoaded: true,
          lsdStatusLoaded: true,
          lsdStatusError: undefined,
          refresh: jest.fn(),
          aiModels: [],
          aiModelsLoaded: true,
          aiModelsError: undefined,
          maasModels,
          maasModelsLoaded: true,
          maasModelsError: undefined,
          models: [
            // eslint-disable-next-line camelcase
            { id: 'test-model', modelId: 'test-model', object: 'model', created: 0, owned_by: '' },
          ],
          modelsError: undefined,
          nemoGuardrailsStatus: null,
          nemoGuardrailsStatusLoaded: true,
          nemoGuardrailsStatusError: undefined,
          lastInput: '',
          setLastInput: jest.fn(),
        }}
      >
        <GenAiContext.Provider
          value={{
            namespace: { name: 'test-namespace' } as Namespace,
            apiState: { apiAvailable: false, api: null as never },
            refreshAPIState: jest.fn(),
          }}
        >
          <ChatbotMain />
        </GenAiContext.Provider>
      </ChatbotContext.Provider>,
    );
    return actualStore;
  };

  it('should not treat the auto-picked model subscription as an unsaved change', () => {
    const actualStore = renderWithActualStore([
      {
        id: 'test-model',
        subscriptions: [{ name: 'priority-sub' }, { name: 'other-sub' }],
      } as AIModel,
    ]);

    act(() => mockChatbotPlayground.mock.calls.at(-1)?.[0].onInitialModelSelected?.('test-model'));
    act(() => actualStore.getState().updateSelectedModel('default', 'test-model'));
    // The subscription dropdown auto-picks the highest-priority subscription — not a user edit
    act(() => actualStore.getState().updateSelectedSubscription('default', 'priority-sub'));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    // Choosing a different subscription is a user edit
    act(() => actualStore.getState().updateSelectedSubscription('default', 'other-sub'));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(true);
    expect(jest.mocked(useSafeBrowserUnloadBlocker)).toHaveBeenLastCalledWith(true);
    expect(jest.mocked(SafeNavigationBlocker)).toHaveBeenLastCalledWith(
      expect.objectContaining({ hasUnsavedChanges: true }),
      expect.anything(),
    );
    act(() => mockChatbotPlayground.mock.calls.at(-1)?.[0].onRevertToDefaults?.('default'));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    expect(actualStore.getState().configurations.default?.selectedSubscription).toBe('');
    expect(jest.mocked(useSafeBrowserUnloadBlocker)).toHaveBeenLastCalledWith(false);
    act(() => actualStore.getState().resetConfiguration());
  });

  it('should keep the inline vector store when reverting to the starting settings', () => {
    const actualStore = renderWithActualStore([]);

    act(() => mockChatbotPlayground.mock.calls.at(-1)?.[0].onInitialModelSelected?.('test-model'));
    act(() => actualStore.getState().updateSelectedModel('default', 'test-model'));
    // Inline-mode documents auto-provision a vector store — not a user edit
    act(() => actualStore.getState().updateSelectedVectorStoreId('default', 'doc-store'));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    act(() => actualStore.getState().updateTemperature('default', 0.5));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(true);
    act(() => mockChatbotPlayground.mock.calls.at(-1)?.[0].onRevertToDefaults?.('default'));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    // RAG stays connected to the uploaded documents after reverting
    expect(actualStore.getState().configurations.default?.selectedVectorStoreId).toBe('doc-store');
    act(() => actualStore.getState().resetConfiguration());
  });

  it('should keep the conversation vision image flag when reverting to the starting settings', () => {
    const actualStore = renderWithActualStore([]);

    act(() => mockChatbotPlayground.mock.calls.at(-1)?.[0].onInitialModelSelected?.('test-model'));
    act(() => actualStore.getState().updateSelectedModel('default', 'test-model'));
    // A conversation image upload sets the vision flag — not a user edit
    act(() => actualStore.getState().updateHasVisionImage('default', true));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    act(() => actualStore.getState().updateTemperature('default', 0.5));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(true);
    act(() => mockChatbotPlayground.mock.calls.at(-1)?.[0].onRevertToDefaults?.('default'));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    // The conversation still holds the uploaded image — the flag survives the revert
    expect(actualStore.getState().configurations.default?.hasVisionImage).toBe(true);
    act(() => actualStore.getState().resetConfiguration());
  });

  it('should not treat a removed and re-added MCP server with unchanged tool selections as an unsaved change', () => {
    const actualStore = renderWithActualStore([]);

    // Selections restored from sessionStorage before initialization captures the baseline
    act(() =>
      actualStore
        .getState()
        .saveToolSelections('default', 'test-namespace', 'https://a.example.com/mcp', [
          'tool-1',
          'tool-2',
        ]),
    );
    act(() =>
      actualStore
        .getState()
        .saveToolSelections('default', 'test-namespace', 'https://b.example.com/mcp', ['tool-3']),
    );
    act(() => mockChatbotPlayground.mock.calls.at(-1)?.[0].onInitialModelSelected?.('test-model'));
    act(() => actualStore.getState().updateSelectedModel('default', 'test-model'));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);

    // Removing a server drops its selections — a real change
    act(() =>
      actualStore
        .getState()
        .saveToolSelections('default', 'test-namespace', 'https://a.example.com/mcp', undefined),
    );
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(true);

    // Re-adding it with the same tools lands the server key at a different insertion
    // position — the selections themselves are unchanged, so this is not dirty
    act(() =>
      actualStore
        .getState()
        .saveToolSelections('default', 'test-namespace', 'https://a.example.com/mcp', [
          'tool-1',
          'tool-2',
        ]),
    );
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);

    // Tool order within a server carries semantics — reordering reads as dirty
    act(() =>
      actualStore
        .getState()
        .saveToolSelections('default', 'test-namespace', 'https://a.example.com/mcp', [
          'tool-2',
          'tool-1',
        ]),
    );
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(true);

    window.sessionStorage.clear();
    act(() => actualStore.getState().resetConfiguration());
  });

  it('should adopt the retained configuration as the baseline when no baseline exists', () => {
    const actualStore = renderWithActualStore([]);

    // Simulate a remount: the singleton store keeps an initialized configuration
    // while the component's baselines start empty — the playground never re-reports
    // its initial model because one is already selected
    act(() => actualStore.getState().updateTemperature('default', 0.5));
    act(() => actualStore.getState().updateSelectedModel('default', 'test-model'));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    // Revert restores the retained settings, not raw defaults
    act(() => actualStore.getState().updateTemperature('default', 0.9));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(true);
    act(() => mockChatbotPlayground.mock.calls.at(-1)?.[0].onRevertToDefaults?.('default'));
    expect(actualStore.getState().configurations.default?.temperature).toBe(0.5);
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    act(() => actualStore.getState().resetConfiguration());
  });

  it('should revert only the corresponding pane and keep compare mode', () => {
    const actualStore = renderWithActualStore([]);

    act(() => mockChatbotPlayground.mock.calls.at(-1)?.[0].onInitialModelSelected?.('test-model'));
    act(() => actualStore.getState().updateSelectedModel('default', 'test-model'));
    // Enter compare mode through the compare confirmation flow
    act(() => jest.mocked(ChatModal).mock.calls.at(-1)?.[0].onConfirm());
    const [, secondConfigId] = actualStore.getState().configIds;
    expect(secondConfigId).toBeDefined();

    // Edits to the second pane trip the navigation guard even while the first pane
    // is active and clean in the settings panel
    act(() => actualStore.getState().updateTemperature(secondConfigId, 0.9));
    expect(jest.mocked(useSafeBrowserUnloadBlocker)).toHaveBeenLastCalledWith(true);
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);

    // Switch the settings panel to the edited pane — its Revert becomes available
    const switchActivePane = mockChatbotPlayground.mock.calls.at(-1)?.[0].setActivePaneConfigId;
    act(() => switchActivePane?.(secondConfigId));
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(true);

    // Reverting the second pane leaves compare mode and the first pane intact
    act(() => mockChatbotPlayground.mock.calls.at(-1)?.[0].onRevertToDefaults?.(secondConfigId));
    expect(actualStore.getState().configIds).toHaveLength(2);
    expect(actualStore.getState().configurations[secondConfigId]?.temperature).toBe(
      DEFAULT_CONFIGURATION.temperature,
    );
    expect(actualStore.getState().configurations.default?.temperature).toBe(
      DEFAULT_CONFIGURATION.temperature,
    );
    expect(mockChatbotPlayground.mock.calls.at(-1)?.[0].isDefaultConfigDirty).toBe(false);
    expect(jest.mocked(useSafeBrowserUnloadBlocker)).toHaveBeenLastCalledWith(false);

    act(() => actualStore.getState().resetConfiguration());
  });
});

describe('ChatbotMain - Playground update state', () => {
  const createLsdStatus = (
    phase: 'Initializing' | 'Ready' | 'Failed',
  ): LlamaStackDistributionModel => ({
    name: 'lsd-playground',
    phase,
    version: '0.1.0',
    distributionConfig: {
      activeDistribution: 'rh',
      providers: [],
      availableDistributions: {},
    },
  });

  const buildChatbotContext = (lsdStatus: LlamaStackDistributionModel | null) => ({
    lsdStatus,
    modelsLoaded: true,
    lsdStatusLoaded: true,
    lsdStatusError: undefined,
    refresh: jest.fn(),
    // eslint-disable-next-line camelcase
    aiModels: [{ model_name: 'test-model', model_id: 'test-model' } as AAModelResponse],
    aiModelsLoaded: true,
    aiModelsError: undefined,
    maasModels: [] as AAModelResponse[],
    maasModelsLoaded: true,
    maasModelsError: undefined,
    models: [],
    modelsError: undefined,
    nemoGuardrailsStatus: null,
    nemoGuardrailsStatusLoaded: true,
    nemoGuardrailsStatusError: undefined,
    lastInput: '',
    setLastInput: jest.fn(),
  });

  const genAiContext = {
    namespace: { name: 'test-namespace' } as Namespace,
    apiState: { apiAvailable: false, api: null as unknown as never },
    refreshAPIState: jest.fn(),
  };

  const renderChatbotMain = (lsdStatus: LlamaStackDistributionModel | null) =>
    render(
      <ChatbotContext.Provider value={buildChatbotContext(lsdStatus)}>
        <GenAiContext.Provider value={genAiContext}>
          <ChatbotMain />
        </GenAiContext.Provider>
      </ChatbotContext.Provider>,
    );

  const initiateUpdate = () => {
    // Open the configure playground modal via the empty state action, then
    // simulate the modal reporting that an update was submitted
    fireEvent.click(screen.getByTestId('empty-state-action-button'));
    fireEvent.click(screen.getByTestId('mock-update-initiated-button'));
  };

  it('should show "Creating playground" when no update was initiated', () => {
    renderChatbotMain(createLsdStatus('Initializing'));

    expect(screen.getByText('Creating playground')).toBeInTheDocument();
  });

  it('should show "Updating playground" while the service restarts after an update', () => {
    const { rerender } = renderChatbotMain(null);
    initiateUpdate();

    rerender(
      <ChatbotContext.Provider value={buildChatbotContext(createLsdStatus('Initializing'))}>
        <GenAiContext.Provider value={genAiContext}>
          <ChatbotMain />
        </GenAiContext.Provider>
      </ChatbotContext.Provider>,
    );

    expect(screen.getByText('Updating playground')).toBeInTheDocument();
    expect(screen.queryByText('Creating playground')).not.toBeInTheDocument();
  });

  it('should show "Playground update failed" when the restart fails after an update', () => {
    const { rerender } = renderChatbotMain(null);
    initiateUpdate();

    rerender(
      <ChatbotContext.Provider value={buildChatbotContext(createLsdStatus('Failed'))}>
        <GenAiContext.Provider value={genAiContext}>
          <ChatbotMain />
        </GenAiContext.Provider>
      </ChatbotContext.Provider>,
    );

    expect(screen.getByText('Playground update failed')).toBeInTheDocument();
  });

  it('should reset to "Creating playground" after the restarted playground becomes ready', () => {
    const { rerender } = renderChatbotMain(null);
    initiateUpdate();

    rerender(
      <ChatbotContext.Provider value={buildChatbotContext(createLsdStatus('Initializing'))}>
        <GenAiContext.Provider value={genAiContext}>
          <ChatbotMain />
        </GenAiContext.Provider>
      </ChatbotContext.Provider>,
    );
    expect(screen.getByText('Updating playground')).toBeInTheDocument();

    // Playground becomes ready again — the update flag is cleared
    rerender(
      <ChatbotContext.Provider value={buildChatbotContext(createLsdStatus('Ready'))}>
        <GenAiContext.Provider value={genAiContext}>
          <ChatbotMain />
        </GenAiContext.Provider>
      </ChatbotContext.Provider>,
    );

    // A later creation shows create wording again
    rerender(
      <ChatbotContext.Provider value={buildChatbotContext(createLsdStatus('Initializing'))}>
        <GenAiContext.Provider value={genAiContext}>
          <ChatbotMain />
        </GenAiContext.Provider>
      </ChatbotContext.Provider>,
    );
    expect(screen.getByText('Creating playground')).toBeInTheDocument();
  });
});
