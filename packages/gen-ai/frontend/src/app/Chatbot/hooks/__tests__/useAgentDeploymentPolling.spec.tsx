import { act, renderHook } from '@testing-library/react';
import useAgentDeploymentPolling from '~/app/Chatbot/hooks/useAgentDeploymentPolling';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { useNotification } from '~/app/hooks/useNotification';

jest.mock('~/app/hooks/useGenAiAPI', () => ({
  useGenAiAPI: jest.fn(),
}));

jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: jest.fn(),
}));

const mockUseGenAiAPI = jest.mocked(useGenAiAPI);
const mockUseNotification = jest.mocked(useNotification);

const createResponse = {
  llamaStackConfigMapName: 'llama-stack-config-profile-a1b2',
  wrapperAppConfigMapName: 'wrapper-app-profile-c3d4',
  sandboxName: 'hr-chatbot-a1b2',
  namespace: 'my-project',
  routeUrl: 'https://hr-chatbot-a1b2-my-project.apps.example.com',
  agentProfileId: 'profile-id',
};

describe('useAgentDeploymentPolling', () => {
  const notification = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    remove: jest.fn(),
  };
  const onStarted = jest.fn();
  const onComplete = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUseNotification.mockReturnValue(notification);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const startOptions = {
    name: 'hr-chatbot',
    agentProfileId: 'profile-id',
    namespace: 'my-project',
    onStarted,
    onComplete,
  };

  it('should notify success when the deployment becomes ready during the initial polls', async () => {
    const createAgentDeployment = jest.fn().mockResolvedValue(createResponse);
    const getAgentDeployment = jest.fn().mockResolvedValue({
      name: createResponse.sandboxName,
      namespace: 'my-project',
      agentProfileId: 'profile-id',
      state: 'ready',
      routeUrl: createResponse.routeUrl,
      createdAt: '2026-10-02T00:00:00Z',
    });
    mockUseGenAiAPI.mockReturnValue({
      apiAvailable: true,
      api: { createAgentDeployment, getAgentDeployment },
      refreshAllAPI: jest.fn(),
    } as unknown as ReturnType<typeof useGenAiAPI>);

    const { result } = renderHook(() => useAgentDeploymentPolling());
    await act(async () => result.current.startAgentDeployment(startOptions));

    expect(createAgentDeployment).toHaveBeenCalledWith({
      name: 'hr-chatbot',
      agentProfileId: 'profile-id',
    });
    expect(getAgentDeployment).toHaveBeenCalledWith({ id: createResponse.sandboxName });
    expect(notification.success).toHaveBeenCalledWith('hr-chatbot deployed successfully');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onStarted).not.toHaveBeenCalled();
  });

  it('should close the modal and notify started after three creating polls', async () => {
    const createAgentDeployment = jest.fn().mockResolvedValue(createResponse);
    const getAgentDeployment = jest.fn().mockResolvedValue({
      name: createResponse.sandboxName,
      namespace: 'my-project',
      agentProfileId: 'profile-id',
      state: 'creating',
      createdAt: '2026-10-02T00:00:00Z',
    });
    mockUseGenAiAPI.mockReturnValue({
      apiAvailable: true,
      api: { createAgentDeployment, getAgentDeployment },
      refreshAllAPI: jest.fn(),
    } as unknown as ReturnType<typeof useGenAiAPI>);

    const { result } = renderHook(() => useAgentDeploymentPolling());
    await act(async () => result.current.startAgentDeployment(startOptions));
    await act(async () => jest.advanceTimersByTimeAsync(3000));
    await act(async () => jest.advanceTimersByTimeAsync(3000));

    expect(getAgentDeployment).toHaveBeenCalledTimes(3);
    expect(notification.info).toHaveBeenCalledWith('Deploying hr-chatbot to my-project...');
    expect(onStarted).toHaveBeenCalledTimes(1);
  });

  it('should notify failure when the deployment reaches a failed state', async () => {
    const createAgentDeployment = jest.fn().mockResolvedValue(createResponse);
    const getAgentDeployment = jest.fn().mockResolvedValue({
      name: createResponse.sandboxName,
      namespace: 'my-project',
      agentProfileId: 'profile-id',
      state: 'failed',
      lastError: 'Sandbox image pull failed',
      createdAt: '2026-10-02T00:00:00Z',
    });
    mockUseGenAiAPI.mockReturnValue({
      apiAvailable: true,
      api: { createAgentDeployment, getAgentDeployment },
      refreshAllAPI: jest.fn(),
    } as unknown as ReturnType<typeof useGenAiAPI>);

    const { result } = renderHook(() => useAgentDeploymentPolling());
    await act(async () => result.current.startAgentDeployment(startOptions));

    expect(notification.error).toHaveBeenCalledWith(
      'hr-chatbot failed to deploy',
      'Sandbox image pull failed',
    );
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('should reset modal loading without stopping background polling', async () => {
    const createAgentDeployment = jest.fn().mockResolvedValue(createResponse);
    const getAgentDeployment = jest.fn().mockResolvedValue({
      name: createResponse.sandboxName,
      namespace: 'my-project',
      agentProfileId: 'profile-id',
      state: 'creating',
      createdAt: '2026-10-02T00:00:00Z',
    });
    mockUseGenAiAPI.mockReturnValue({
      apiAvailable: true,
      api: { createAgentDeployment, getAgentDeployment },
      refreshAllAPI: jest.fn(),
    } as unknown as ReturnType<typeof useGenAiAPI>);

    const { result } = renderHook(() => useAgentDeploymentPolling());
    await act(async () => result.current.startAgentDeployment(startOptions));
    expect(result.current.isDeploying).toBe(true);

    act(() => result.current.resetDeploymentLoading());
    expect(result.current.isDeploying).toBe(false);

    await act(async () => jest.advanceTimersByTimeAsync(3000));
    expect(getAgentDeployment).toHaveBeenCalledTimes(2);
  });
});
