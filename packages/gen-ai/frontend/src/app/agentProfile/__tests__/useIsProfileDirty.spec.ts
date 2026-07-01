/* eslint-disable camelcase */
import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { useChatbotConfigStore, DEFAULT_CONFIG_ID } from '~/app/Chatbot/store';
import { DEFAULT_CONFIGURATION } from '~/app/Chatbot/store/types';
import useIsProfileDirty from '~/app/agentProfile/useIsProfileDirty';
import type { AgentProfileSpec } from '~/app/agentProfile/types';

import useFetchMCPServers from '~/app/hooks/useFetchMCPServers';

jest.mock('~/app/hooks/useFetchMCPServers', () => ({
  __esModule: true,
  default: jest.fn(() => ({ data: [], configMapName: null, loaded: true })),
}));

const emptyChatbotContext = {
  models: [],
  modelsLoaded: true,
  modelsError: undefined,
  aiModels: [],
  aiModelsLoaded: true,
  aiModelsError: undefined,
  maasModels: [],
  maasModelsLoaded: true,
  maasModelsError: undefined,
  lsdStatus: null,
  lsdStatusLoaded: true,
  lsdStatusError: undefined,
  refresh: jest.fn(),
  lastInput: '',
  setLastInput: jest.fn(),
};

const wrapper: React.FC<React.PropsWithChildren> = ({ children }) =>
  React.createElement(ChatbotContext.Provider, { value: emptyChatbotContext as never }, children);

/** Minimal AgentProfileSpec that matches DEFAULT_CONFIGURATION with no model context. */
const makeMatchingSpec = (overrides: Partial<AgentProfileSpec> = {}): AgentProfileSpec => ({
  displayName: 'Test Agent',
  model: { id: DEFAULT_CONFIGURATION.selectedModel, uri: '' },
  temperature: DEFAULT_CONFIGURATION.temperature,
  stream: DEFAULT_CONFIGURATION.isStreamingEnabled,
  ...overrides,
});

const resetStore = () =>
  useChatbotConfigStore.setState({
    configurations: { [DEFAULT_CONFIG_ID]: { ...DEFAULT_CONFIGURATION } },
    configIds: [DEFAULT_CONFIG_ID],
    profileApplied: false,
    loadedProfileId: null,
    loadedProfileDisplayName: null,
    loadedProfileDescription: null,
    loadedProfileSpec: null,
  });

describe('useIsProfileDirty', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  it('should return false when no profile is loaded', () => {
    useChatbotConfigStore.setState({ profileApplied: false, loadedProfileSpec: null });

    const { result } = renderHook(() => useIsProfileDirty(DEFAULT_CONFIG_ID), { wrapper });
    expect(result.current).toBe(false);
  });

  it('should return false when loadedProfileSpec is null', () => {
    useChatbotConfigStore.setState({ profileApplied: true, loadedProfileSpec: null });

    const { result } = renderHook(() => useIsProfileDirty(DEFAULT_CONFIG_ID), { wrapper });
    expect(result.current).toBe(false);
  });

  it('should return false when config matches the snapshot', () => {
    useChatbotConfigStore.setState({
      profileApplied: true,
      loadedProfileSpec: makeMatchingSpec(),
    });

    const { result } = renderHook(() => useIsProfileDirty(DEFAULT_CONFIG_ID), { wrapper });
    expect(result.current).toBe(false);
  });

  it('should return true when temperature differs from snapshot', () => {
    useChatbotConfigStore.setState({
      profileApplied: true,
      loadedProfileSpec: makeMatchingSpec({ temperature: 0.9 }),
    });

    const { result } = renderHook(() => useIsProfileDirty(DEFAULT_CONFIG_ID), { wrapper });
    expect(result.current).toBe(true);
  });

  it('should return true when model ID differs from snapshot', () => {
    useChatbotConfigStore.setState({
      profileApplied: true,
      loadedProfileSpec: makeMatchingSpec({ model: { id: 'different-model', uri: '' } }),
    });

    const { result } = renderHook(() => useIsProfileDirty(DEFAULT_CONFIG_ID), { wrapper });
    expect(result.current).toBe(true);
  });

  it('should return true when streaming setting differs from snapshot', () => {
    useChatbotConfigStore.setState({
      profileApplied: true,
      loadedProfileSpec: makeMatchingSpec({ stream: !DEFAULT_CONFIGURATION.isStreamingEnabled }),
    });

    const { result } = renderHook(() => useIsProfileDirty(DEFAULT_CONFIG_ID), { wrapper });
    expect(result.current).toBe(true);
  });

  it('should ignore displayName, description, and guardrails fields in snapshot', () => {
    useChatbotConfigStore.setState({
      profileApplied: true,
      loadedProfileSpec: makeMatchingSpec({
        description: 'some description',
        guardrails: [
          { provider: 'test', guardrailRef: { kind: 'ConfigMap', name: 'g', key: 'k' } },
        ],
      }),
    });

    const { result } = renderHook(() => useIsProfileDirty(DEFAULT_CONFIG_ID), { wrapper });
    expect(result.current).toBe(false);
  });

  it('should return false when mcpServers in snapshot are in different order than serialized config', () => {
    // Give useFetchMCPServers real servers so serializeToAgentProfileSpec produces mcpServers.
    jest.mocked(useFetchMCPServers).mockReturnValueOnce({
      data: [
        { name: 'server-a', url: 'http://server-a' },
        { name: 'server-b', url: 'http://server-b' },
      ] as never,
      configMapName: 'gen-ai-aa-mcp-servers',
      loaded: true,
      error: undefined,
    });

    // Config selects servers in [A, B] order — serialized spec will have [A, B].
    // Snapshot has them in [B, A] order. normalizeSpec sorts both → equal → not dirty.
    useChatbotConfigStore.setState({
      profileApplied: true,
      loadedProfileSpec: makeMatchingSpec({
        mcpServers: [
          { serverRef: { kind: 'ConfigMap', name: 'gen-ai-aa-mcp-servers', key: 'server-b' } },
          { serverRef: { kind: 'ConfigMap', name: 'gen-ai-aa-mcp-servers', key: 'server-a' } },
        ],
      }),
      configurations: {
        [DEFAULT_CONFIG_ID]: {
          ...DEFAULT_CONFIGURATION,
          selectedMcpServerIds: ['http://server-a', 'http://server-b'],
        },
      },
    });

    const { result } = renderHook(() => useIsProfileDirty(DEFAULT_CONFIG_ID), { wrapper });
    expect(result.current).toBe(false);
  });

  it('should return false when config is undefined', () => {
    useChatbotConfigStore.setState({
      profileApplied: true,
      loadedProfileSpec: makeMatchingSpec(),
      configurations: {},
    });

    const { result } = renderHook(() => useIsProfileDirty(DEFAULT_CONFIG_ID), { wrapper });
    expect(result.current).toBe(false);
  });
});
