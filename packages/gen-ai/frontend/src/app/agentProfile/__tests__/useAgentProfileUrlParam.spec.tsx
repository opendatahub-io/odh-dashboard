import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { AnalyticsTrackingProvider } from '@odh-dashboard/analytics/react';
import { GenAiContext } from '~/app/context/GenAiContext';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { useChatbotConfigStore } from '~/app/Chatbot/store';
import type { AgentProfile } from '~/app/agentProfile/types';
import useAgentProfileUrlParam from '~/app/agentProfile/useAgentProfileUrlParam';
import {
  validateAgentProfileAsync,
  type AsyncValidationResult,
} from '~/app/agentProfile/validateAgentProfile';

const mockGetAgentProfile = jest.fn();
const mockApi = { getAgentProfile: mockGetAgentProfile };
let mockApiAvailable = true;
let mockSearchParams = new URLSearchParams();
jest.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams],
}));
jest.mock('~/app/hooks/useGenAiAPI', () => ({
  useGenAiAPI: () => ({ apiAvailable: mockApiAvailable, api: mockApi }),
}));
jest.mock('~/app/agentProfile/deserialize', () => ({
  deserializeAgentProfile: () => ({ config: { selectedModel: 'model-1' } }),
}));
jest.mock('~/app/agentProfile/validateAgentProfile', () => ({
  buildValidationWarnings: () => [],
  validateAgentProfileAsync: jest.fn(),
}));

const profile: AgentProfile = {
  apiVersion: 'genai.redhat.com/v1alpha1',
  kind: 'AgentProfile',
  metadata: { name: 'profile-1', resourceVersion: '1' },
  spec: { displayName: 'Agent', model: { id: 'model-1', uri: 'http://model/v1' } },
};

type TrackingCallbacks = React.ComponentProps<typeof AnalyticsTrackingProvider>['value'];

const renderProfileLoader = (
  getTracking: () => TrackingCallbacks,
  readiness = { modelsLoaded: true, mcpServersLoaded: true },
) => {
  const loadingStates: boolean[] = [];
  const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
    const genAi = React.useContext(GenAiContext);
    const chatbot = React.useContext(ChatbotContext);
    const genAiValue = React.useMemo(() => ({ ...genAi, namespace: { name: 'test-ns' } }), [genAi]);
    const { modelsLoaded } = readiness;
    const chatbotValue = React.useMemo(
      () => ({ ...chatbot, modelsLoaded }),
      [chatbot, modelsLoaded],
    );
    return (
      <AnalyticsTrackingProvider value={getTracking()}>
        <GenAiContext.Provider value={genAiValue}>
          <ChatbotContext.Provider value={chatbotValue}>{children}</ChatbotContext.Provider>
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
  const rendered = renderHook(
    () => {
      const result = useAgentProfileUrlParam({
        ...args,
        mcpServersLoaded: readiness.mcpServersLoaded,
      });
      loadingStates.push(result.loading);
      return result;
    },
    { wrapper: Wrapper },
  );
  return { ...rendered, loadingStates };
};

describe('agent-profile URL tracking', () => {
  beforeEach(() => {
    mockGetAgentProfile.mockReset();
    mockApiAvailable = true;
    mockSearchParams = new URLSearchParams('agentProfileId=profile-1');
    jest.mocked(validateAgentProfileAsync).mockReset().mockResolvedValue({ warnings: [] });
    useChatbotConfigStore.setState(useChatbotConfigStore.getInitialState(), true);
  });

  it('should keep the replacement load pending until its own request completes', async () => {
    let resolveFirst!: (value: AgentProfile) => void;
    let resolveSecond!: (value: AgentProfile) => void;
    const firstPending = new Promise<AgentProfile>((resolve) => {
      resolveFirst = resolve;
    });
    const secondPending = new Promise<AgentProfile>((resolve) => {
      resolveSecond = resolve;
    });
    mockGetAgentProfile.mockReturnValueOnce(firstPending).mockReturnValueOnce(secondPending);
    const first = jest.fn();
    const second = jest.fn();
    let tracking = { trackEvent: first, trackPageEvent: jest.fn() };
    const rendered = renderProfileLoader(() => tracking);
    expect(mockGetAgentProfile).toHaveBeenCalledTimes(1);
    expect(rendered.result.current.loading).toBe(true);
    const replacementRenderStart = rendered.loadingStates.length;
    tracking = { ...tracking, trackEvent: second };
    rendered.rerender();
    expect(mockGetAgentProfile).toHaveBeenCalledTimes(2);
    expect(rendered.loadingStates.slice(replacementRenderStart)).not.toContain(false);
    await act(async () => {
      resolveFirst(profile);
    });
    expect(rendered.result.current.loading).toBe(true);
    expect(rendered.result.current.error).toBeUndefined();
    expect(useChatbotConfigStore.getState().loadedProfileId).toBeNull();
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();

    await act(async () => {
      resolveSecond(profile);
    });
    expect(rendered.result.current.loading).toBe(false);
    expect(useChatbotConfigStore.getState().loadedProfileId).toBe('profile-1');
    expect(first).not.toHaveBeenCalled();
    expect(second.mock.calls).toEqual([['Playground Agent Loaded', { agentID: 'profile-1' }]]);
    rendered.rerender();
    expect(second).toHaveBeenCalledTimes(1);
    expect(mockGetAgentProfile).toHaveBeenCalledTimes(2);
  });

  it.each(['apiAvailable', 'modelsLoaded', 'mcpServersLoaded'] as const)(
    'should stop a cancelled load when %s blocks its replacement',
    async (gate) => {
      let resolveProfile!: (value: AgentProfile) => void;
      const pending = new Promise<AgentProfile>((resolve) => {
        resolveProfile = resolve;
      });
      mockGetAgentProfile.mockReturnValueOnce(pending).mockResolvedValueOnce(profile);
      const tracking = { trackEvent: jest.fn(), trackPageEvent: jest.fn() };
      const readiness = { modelsLoaded: true, mcpServersLoaded: true };
      const rendered = renderProfileLoader(() => tracking, readiness);
      expect(rendered.result.current.loading).toBe(true);

      if (gate === 'apiAvailable') {
        mockApiAvailable = false;
      } else {
        readiness[gate] = false;
      }
      rendered.rerender();
      expect(rendered.result.current.loading).toBe(false);
      expect(mockGetAgentProfile).toHaveBeenCalledTimes(1);
      await act(async () => {
        resolveProfile(profile);
      });
      expect(rendered.result.current.loading).toBe(false);
      expect(useChatbotConfigStore.getState().loadedProfileId).toBeNull();
      expect(tracking.trackEvent).not.toHaveBeenCalled();

      mockApiAvailable = true;
      readiness.modelsLoaded = true;
      readiness.mcpServersLoaded = true;
      await act(async () => {
        rendered.rerender();
      });
      expect(mockGetAgentProfile).toHaveBeenCalledTimes(2);
      expect(useChatbotConfigStore.getState().loadedProfileId).toBe('profile-1');
      expect(rendered.result.current.loading).toBe(false);
      expect(tracking.trackEvent).toHaveBeenCalledTimes(1);
    },
  );

  it('should stop a pending load when the same profile is applied externally', async () => {
    let resolveProfile!: (value: AgentProfile) => void;
    const pending = new Promise<AgentProfile>((resolve) => {
      resolveProfile = resolve;
    });
    mockGetAgentProfile.mockReturnValueOnce(pending);
    const tracking = { trackEvent: jest.fn(), trackPageEvent: jest.fn() };
    const rendered = renderProfileLoader(() => tracking);
    expect(rendered.result.current.loading).toBe(true);

    act(() => {
      useChatbotConfigStore
        .getState()
        .applyAgentProfile({ selectedModel: 'saved-model' }, 'profile-1');
    });
    expect(rendered.result.current.loading).toBe(false);
    await act(async () => {
      resolveProfile(profile);
    });
    expect(rendered.result.current.loading).toBe(false);
    expect(mockGetAgentProfile).toHaveBeenCalledTimes(1);
    expect(validateAgentProfileAsync).not.toHaveBeenCalled();
    expect(tracking.trackEvent).not.toHaveBeenCalled();
  });

  it('should stop loading when the profile ID is cleared and ignore the pending response', async () => {
    let resolveProfile!: (value: AgentProfile) => void;
    const pending = new Promise<AgentProfile>((resolve) => {
      resolveProfile = resolve;
    });
    mockGetAgentProfile.mockReturnValueOnce(pending);
    const tracking = { trackEvent: jest.fn(), trackPageEvent: jest.fn() };
    const rendered = renderProfileLoader(() => tracking);
    expect(rendered.result.current.loading).toBe(true);

    mockSearchParams = new URLSearchParams();
    rendered.rerender();
    expect(rendered.result.current.loading).toBe(false);
    await act(async () => {
      resolveProfile(profile);
    });
    expect(rendered.result.current.loading).toBe(false);
    expect(useChatbotConfigStore.getState().loadedProfileId).toBeNull();
    expect(tracking.trackEvent).not.toHaveBeenCalled();
    expect(mockGetAgentProfile).toHaveBeenCalledTimes(1);
  });

  it('should finish loading and report an active request failure', async () => {
    let rejectProfile!: (error: Error) => void;
    const pending = new Promise<AgentProfile>((_resolve, reject) => {
      rejectProfile = reject;
    });
    mockGetAgentProfile.mockReturnValueOnce(pending);
    const tracking = { trackEvent: jest.fn(), trackPageEvent: jest.fn() };
    const rendered = renderProfileLoader(() => tracking);
    expect(rendered.result.current.loading).toBe(true);

    const error = new Error('Unauthorized');
    await act(async () => {
      rejectProfile(error);
    });
    expect(rendered.result.current.loading).toBe(false);
    expect(rendered.result.current.error).toBe(error);
    expect(tracking.trackEvent.mock.calls).toEqual([
      ['Playground Agent Load Interrupted', { agentID: 'profile-1', failureReason: 'auth_error' }],
    ]);
  });

  it.each(['resolve', 'reject'] as const)(
    'should finish superseded validation when it %ss without a replacement request',
    async (outcome) => {
      let resolveValidation!: (result: AsyncValidationResult) => void;
      let rejectValidation!: (error: Error) => void;
      const validation = new Promise<AsyncValidationResult>((resolve, reject) => {
        resolveValidation = resolve;
        rejectValidation = reject;
      });
      jest.mocked(validateAgentProfileAsync).mockReturnValueOnce(validation);
      const response = Promise.resolve(profile);
      mockGetAgentProfile.mockReturnValueOnce(response);
      const tracking = { trackEvent: jest.fn(), trackPageEvent: jest.fn() };
      const rendered = renderProfileLoader(() => tracking);
      await act(async () => {
        await response;
      });
      expect(useChatbotConfigStore.getState().loadedProfileId).toBe('profile-1');
      expect(rendered.result.current.loading).toBe(true);

      act(() => {
        mockApiAvailable = false;
        useChatbotConfigStore.getState().applyAgentProfile({}, 'profile-2');
      });
      await act(async () => {
        if (outcome === 'resolve') {
          resolveValidation({ warnings: [] });
        } else {
          rejectValidation(new Error('Validation failed'));
        }
      });
      expect(rendered.result.current.loading).toBe(false);
      expect(rendered.result.current.error).toBeUndefined();
      expect(useChatbotConfigStore.getState().loadedProfileId).toBe('profile-2');
      expect(useChatbotConfigStore.getState().loadedProfileSpec).toBeNull();
      expect(mockGetAgentProfile).toHaveBeenCalledTimes(1);
      expect(tracking.trackEvent.mock.calls).toEqual([
        ['Playground Agent Loaded', { agentID: 'profile-1' }],
      ]);
    },
  );

  it.each(['resolve', 'reject'] as const)(
    'should keep a replacement request loading when previous validation %ss',
    async (outcome) => {
      let resolveValidation!: (result: AsyncValidationResult) => void;
      let rejectValidation!: (error: Error) => void;
      const validation = new Promise<AsyncValidationResult>((resolve, reject) => {
        resolveValidation = resolve;
        rejectValidation = reject;
      });
      jest.mocked(validateAgentProfileAsync).mockReturnValueOnce(validation);
      let resolveReplacement!: (value: AgentProfile) => void;
      const replacement = new Promise<AgentProfile>((resolve) => {
        resolveReplacement = resolve;
      });
      const response = Promise.resolve(profile);
      mockGetAgentProfile.mockReturnValueOnce(response).mockReturnValueOnce(replacement);
      const tracking = { trackEvent: jest.fn(), trackPageEvent: jest.fn() };
      const rendered = renderProfileLoader(() => tracking);
      await act(async () => {
        await response;
      });
      expect(validateAgentProfileAsync).toHaveBeenCalledTimes(1);
      mockSearchParams = new URLSearchParams('agentProfileId=profile-2');
      rendered.rerender();
      expect(mockGetAgentProfile).toHaveBeenCalledTimes(2);

      await act(async () => {
        if (outcome === 'resolve') {
          resolveValidation({ warnings: [] });
        } else {
          rejectValidation(new Error('Validation failed'));
        }
      });
      expect(rendered.result.current.loading).toBe(true);
      expect(rendered.result.current.error).toBeUndefined();
      await act(async () => {
        resolveReplacement({ ...profile, metadata: { ...profile.metadata, name: 'profile-2' } });
      });
      expect(rendered.result.current.loading).toBe(false);
      expect(useChatbotConfigStore.getState().loadedProfileId).toBe('profile-2');
    },
  );

  it('should finish loading if validation rejects for the applied profile', async () => {
    let rejectValidation!: (error: Error) => void;
    const validation = new Promise<AsyncValidationResult>((_resolve, reject) => {
      rejectValidation = reject;
    });
    jest.mocked(validateAgentProfileAsync).mockReturnValueOnce(validation);
    const response = Promise.resolve(profile);
    mockGetAgentProfile.mockReturnValueOnce(response);
    const tracking = { trackEvent: jest.fn(), trackPageEvent: jest.fn() };
    const rendered = renderProfileLoader(() => tracking);
    await act(async () => {
      await response;
    });
    expect(rendered.result.current.loading).toBe(true);
    expect(useChatbotConfigStore.getState().loadedProfileId).toBe('profile-1');

    await act(async () => {
      rejectValidation(new Error('Validation failed'));
    });
    expect(rendered.result.current.loading).toBe(false);
  });

  it('should use the disabled tracker when pending validation completes', async () => {
    mockGetAgentProfile.mockResolvedValueOnce(profile);
    let finishValidation!: (result: AsyncValidationResult) => void;
    jest.mocked(validateAgentProfileAsync).mockReturnValueOnce(
      new Promise<AsyncValidationResult>((resolve) => {
        finishValidation = resolve;
      }),
    );
    const originalTracker = jest.fn();
    const disabledTracker = jest.fn();
    let tracking = { trackEvent: originalTracker, trackPageEvent: jest.fn() };
    const rendered = renderProfileLoader(() => tracking);

    await act(async () => {
      await Promise.resolve();
    });
    expect(useChatbotConfigStore.getState().loadedProfileId).toBe('profile-1');
    expect(rendered.result.current.loading).toBe(true);

    tracking = { ...tracking, trackEvent: disabledTracker };
    rendered.rerender();
    await act(async () => {
      finishValidation({
        warnings: [{ tab: 'knowledge', message: 'Vector store unavailable' }],
      });
    });

    expect(originalTracker.mock.calls).toEqual([
      ['Playground Agent Loaded', { agentID: 'profile-1' }],
    ]);
    expect(disabledTracker.mock.calls).toEqual([
      [
        'Playground Agent Configuration Unavailable',
        { agentID: 'profile-1', missingComponents: 'vector_store' },
      ],
    ]);
    expect(mockGetAgentProfile).toHaveBeenCalledTimes(1);
    expect(validateAgentProfileAsync).toHaveBeenCalledTimes(1);
    expect(rendered.result.current.loading).toBe(false);
    expect(rendered.result.current.error).toBeUndefined();
  });

  it('should keep loading until validation completes after the profile is applied', async () => {
    const response = Promise.resolve(profile);
    mockGetAgentProfile.mockReturnValueOnce(response);
    let finishValidation!: (result: AsyncValidationResult) => void;
    const validation = new Promise<AsyncValidationResult>((resolve) => {
      finishValidation = resolve;
    });
    jest.mocked(validateAgentProfileAsync).mockReturnValueOnce(validation);
    const tracking = { trackEvent: jest.fn(), trackPageEvent: jest.fn() };
    const rendered = renderProfileLoader(() => tracking);

    await act(async () => {
      await response;
    });
    expect(validateAgentProfileAsync).toHaveBeenCalledTimes(1);
    expect(useChatbotConfigStore.getState().loadedProfileId).toBe('profile-1');
    expect(rendered.result.current.loading).toBe(true);
    await act(async () => {
      finishValidation({ warnings: [] });
    });
    expect(rendered.result.current.loading).toBe(false);
    expect(rendered.result.current.error).toBeUndefined();
    expect(tracking.trackEvent.mock.calls).toEqual([
      ['Playground Agent Loaded', { agentID: 'profile-1' }],
    ]);
  });
});
