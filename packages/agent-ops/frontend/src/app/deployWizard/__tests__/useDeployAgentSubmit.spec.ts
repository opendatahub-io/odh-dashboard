import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { DeployAgentWizardFormData } from '~/app/deployWizard/types';
import { useDeployAgentSubmit } from '~/app/deployWizard/useDeployAgentSubmit';

const mockNavigate = jest.fn();
const mockDeployAgent = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual<typeof import('react-router-dom')>('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('~/app/api/deployAgent', () => ({
  deployAgent: () => (opts: unknown, request: unknown) => mockDeployAgent(opts, request),
}));

jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => ({
    success: mockSuccess,
    error: mockError,
    info: jest.fn(),
    warning: jest.fn(),
    remove: jest.fn(),
  }),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    QueryClientProvider,
    { client: createTestQueryClient() },
    React.createElement(MemoryRouter, null, children),
  );

const validFormData: DeployAgentWizardFormData = {
  project: 'team1',
  containerImage: 'quay.io/myorg/my-agent',
  imageTag: 'latest',
  agentName: 'my-agent',
  description: '',
  pullSecret: '',
  fullImageReference: 'quay.io/myorg/my-agent:latest',
  protocol: 'a2a',
  framework: '',
  workloadType: 'sandbox',
  enablePersistentStorage: false,
  persistentVolumeSize: '1Gi',
  servicePorts: [
    {
      rowId: 'port-1',
      name: 'http',
      port: 8080,
      targetPort: 8000,
      protocol: 'TCP',
    },
  ],
  envVars: [],
};

describe('useDeployAgentSubmit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeployAgent.mockResolvedValue({
      success: true,
      name: 'my-agent',
      namespace: 'team1',
      message: 'Agent deployed successfully',
    });
  });

  it('posts deploy request and navigates to agent detail page on success', async () => {
    const { result } = renderHook(
      () =>
        useDeployAgentSubmit({
          formData: validFormData,
          isDeployFormValid: true,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.submitDeploy();
    });

    expect(mockDeployAgent).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        name: 'my-agent',
        namespace: 'team1',
        containerImage: 'quay.io/myorg/my-agent',
        imageTag: 'latest',
      }),
    );
    expect(mockSuccess).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/ai-hub/agents/deployments/team1/my-agent');
    expect(result.current.deployError).toBeNull();
  });

  it('shows error and does not navigate when response has success: false', async () => {
    mockDeployAgent.mockResolvedValue({
      success: false,
      name: 'my-agent',
      namespace: 'team1',
      message: 'Agent already exists',
    });

    const { result } = renderHook(
      () =>
        useDeployAgentSubmit({
          formData: validFormData,
          isDeployFormValid: true,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.submitDeploy();
    });

    await waitFor(() => {
      expect(result.current.deployError).toBe('Agent already exists');
    });
    expect(mockError).toHaveBeenCalledWith('Deploy failed', 'Agent already exists');
    expect(mockSuccess).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not deploy when form is invalid', async () => {
    const { result } = renderHook(
      () =>
        useDeployAgentSubmit({
          formData: validFormData,
          isDeployFormValid: false,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.submitDeploy();
    });

    expect(mockDeployAgent).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(result.current.deployError).toBe('Complete all required fields before deploying.');
    expect(mockError).not.toHaveBeenCalled();
  });

  it('clears deploy error when form data changes', async () => {
    const { result, rerender } = renderHook(
      ({ formData, isDeployFormValid }) =>
        useDeployAgentSubmit({
          formData,
          isDeployFormValid,
        }),
      {
        wrapper,
        initialProps: {
          formData: validFormData,
          isDeployFormValid: false,
        },
      },
    );

    await act(async () => {
      await result.current.submitDeploy();
    });

    expect(result.current.deployError).toBe('Complete all required fields before deploying.');

    rerender({
      formData: { ...validFormData, framework: 'langgraph' },
      isDeployFormValid: true,
    });

    expect(result.current.deployError).toBeNull();
  });

  it('blocks a second submit while the first deploy is in flight', async () => {
    let resolveDeploy: ((value: unknown) => void) | undefined;
    mockDeployAgent.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDeploy = resolve;
        }),
    );

    const { result } = renderHook(
      () =>
        useDeployAgentSubmit({
          formData: validFormData,
          isDeployFormValid: true,
        }),
      { wrapper },
    );

    let firstSubmit: Promise<void> | undefined;
    act(() => {
      firstSubmit = result.current.submitDeploy();
    });

    await act(async () => {
      await result.current.submitDeploy();
    });

    expect(mockDeployAgent).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveDeploy?.({
        success: true,
        name: 'my-agent',
        namespace: 'team1',
        message: 'Agent deployed successfully',
      });
      await firstSubmit;
    });
  });

  it('sets deploy error and does not navigate on API failure', async () => {
    mockDeployAgent.mockRejectedValue(new Error('Conflict: agent already exists'));

    const { result } = renderHook(
      () =>
        useDeployAgentSubmit({
          formData: validFormData,
          isDeployFormValid: true,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.submitDeploy();
    });

    await waitFor(() => {
      expect(result.current.deployError).toBe('Conflict: agent already exists');
    });
    expect(mockError).toHaveBeenCalledWith('Deploy failed', 'Conflict: agent already exists');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not update submit lock after unmount during deploy', async () => {
    let resolveDeploy: ((value: unknown) => void) | undefined;
    mockDeployAgent.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDeploy = resolve;
        }),
    );

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result, unmount } = renderHook(
      () =>
        useDeployAgentSubmit({
          formData: validFormData,
          isDeployFormValid: true,
        }),
      { wrapper },
    );

    act(() => {
      void result.current.submitDeploy();
    });

    unmount();

    await act(async () => {
      resolveDeploy?.({
        success: true,
        name: 'my-agent',
        namespace: 'team1',
        message: 'Agent deployed successfully',
      });
    });

    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringMatching(/unmounted component/i),
      expect.anything(),
    );
    consoleErrorSpy.mockRestore();
  });
});
