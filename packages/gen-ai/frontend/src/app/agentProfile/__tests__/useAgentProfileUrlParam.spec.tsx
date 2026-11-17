import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { AnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import { GenAiContext } from '~/app/context/GenAiContext';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { createChatbotConfigStore, ChatbotConfigStoreContext } from '~/app/Chatbot/store';
import type { AgentProfile } from '~/app/agentProfile/types';
import useAgentProfileUrlParam from '~/app/agentProfile/useAgentProfileUrlParam';

const mockGetAgentProfile = jest.fn();
const mockApi = { getAgentProfile: mockGetAgentProfile };
jest.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams('agentProfileId=profile-1')],
}));
jest.mock('~/app/hooks/useGenAiAPI', () => ({
  useGenAiAPI: () => ({ apiAvailable: true, api: mockApi }),
}));
jest.mock('~/app/agentProfile/deserialize', () => ({
  deserializeAgentProfile: () => ({ config: { selectedModel: 'model-1' } }),
}));
jest.mock('~/app/agentProfile/validateAgentProfile', () => ({
  buildValidationWarnings: () => [],
  validateAgentProfileAsync: async () => ({ warnings: [] }),
}));

const profile: AgentProfile = {
  apiVersion: 'genai.redhat.com/v1alpha1',
  kind: 'AgentProfile',
  metadata: { name: 'profile-1', resourceVersion: '1' },
  spec: { displayName: 'Agent', model: { id: 'model-1', uri: 'http://model/v1' } },
};

describe('agent-profile URL tracking', () => {
  it('should ignore a superseded load and track once with the replacement callback', async () => {
    let resolveProfile!: (value: AgentProfile) => void;
    const pending = new Promise<AgentProfile>((resolve) => {
      resolveProfile = resolve;
    });
    mockGetAgentProfile.mockReturnValue(pending);
    const first = jest.fn();
    const second = jest.fn();
    let tracking = { trackEvent: first, trackPageEvent: jest.fn() };
    const store = createChatbotConfigStore({ skipSessionStorage: true });
    const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
      const genAi = React.useContext(GenAiContext);
      const chatbot = React.useContext(ChatbotContext);
      const genAiValue = React.useMemo(
        () => ({ ...genAi, namespace: { name: 'test-ns' } }),
        [genAi],
      );
      const chatbotValue = React.useMemo(() => ({ ...chatbot, modelsLoaded: true }), [chatbot]);
      return (
        <AnalyticsTrackingProvider value={tracking}>
          <GenAiContext.Provider value={genAiValue}>
            <ChatbotContext.Provider value={chatbotValue}>
              <ChatbotConfigStoreContext.Provider value={store}>
                {children}
              </ChatbotConfigStoreContext.Provider>
            </ChatbotContext.Provider>
          </GenAiContext.Provider>
        </AnalyticsTrackingProvider>
      );
    };
    const args = {
      mcpServers: [],
      availableMcpServers: [],
      mcpServersLoaded: true,
      mcpServerStatusesResolved: true,
    };
    const rendered = renderHook(() => useAgentProfileUrlParam(args), { wrapper: Wrapper });
    expect(mockGetAgentProfile).toHaveBeenCalledTimes(1);
    tracking = { ...tracking, trackEvent: second };
    rendered.rerender();
    expect(mockGetAgentProfile).toHaveBeenCalledTimes(2);
    await act(async () => {
      resolveProfile(profile);
    });
    expect(first).not.toHaveBeenCalled();
    expect(second.mock.calls).toEqual([['Playground Agent Loaded', { agentID: 'profile-1' }]]);
    rendered.rerender();
    expect(second).toHaveBeenCalledTimes(1);
    expect(mockGetAgentProfile).toHaveBeenCalledTimes(2);
  });
});
