import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AgentProfileDetailPage, {
  buildResponseAPICurl,
} from '~/app/AIAssets/AgentProfileDetailPage';
import useFetchAgentDeployments from '~/app/AIAssets/hooks/useFetchAgentDeployments';
import useFetchAgentProfile from '~/app/AIAssets/hooks/useFetchAgentProfile';
import useFetchAgentProfiles from '~/app/hooks/useFetchAgentProfiles';
import useFetchAIModels from '~/app/hooks/useFetchAIModels';
import useGenAiAgentDeploymentEnabled from '~/app/hooks/useGenAiAgentDeploymentEnabled';
import useGuardrailsEnabled from '~/app/Chatbot/hooks/useGuardrailsEnabled';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { AgentDeploymentSummary, AgentProfile } from '~/app/agentProfile/types';

jest.mock('mod-arch-shared', () => ({
  ApplicationsPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('~/app/AIAssets/hooks/useFetchAgentProfile', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/app/AIAssets/hooks/useFetchAgentDeployments', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/app/hooks/useFetchAgentProfiles', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/app/hooks/useFetchAIModels', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/app/hooks/useGenAiAgentDeploymentEnabled', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/app/hooks/useGenAiAPI', () => ({
  useGenAiAPI: jest.fn(),
}));

jest.mock('~/app/Chatbot/hooks/useGuardrailsEnabled', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseFetchAgentProfile = jest.mocked(useFetchAgentProfile);
const mockUseFetchAgentDeployments = jest.mocked(useFetchAgentDeployments);
const mockUseFetchAgentProfiles = jest.mocked(useFetchAgentProfiles);
const mockUseFetchAIModels = jest.mocked(useFetchAIModels);
const mockUseGenAiAgentDeploymentEnabled = jest.mocked(useGenAiAgentDeploymentEnabled);
const mockUseGuardrailsEnabled = jest.mocked(useGuardrailsEnabled);
const mockUseGenAiAPI = jest.mocked(useGenAiAPI);
const originalScrollIntoView = Element.prototype.scrollIntoView;

afterEach(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

const profile: AgentProfile = {
  apiVersion: 'gen-ai.opendatahub.io/v1alpha1',
  kind: 'AgentProfile',
  metadata: { name: 'agent-profile-123', resourceVersion: '1' },
  spec: {
    displayName: 'HR Chatbot',
    description: 'Answers HR questions',
    model: { id: 'llama-4-scout', uri: 'https://example.com/v1' },
    prompt: { name: 'hr-assistant', source: 'mlflow', version: '3' },
    mcpServers: [
      {
        serverRef: { kind: 'ConfigMap', name: 'gen-ai-aa-mcp-servers', key: 'jira' },
      },
      {
        name: 'registry-tool',
        source: 'mlflow',
      },
    ],
    vectorStores: { stores: [{ id: 'handbook' }] },
  },
};

const deployment: AgentDeploymentSummary = {
  name: 'hr-chatbot-a1b2',
  namespace: 'my-project',
  agentProfileId: '123',
  routeUrl: 'https://hr-chatbot.example.com',
  createdAt: '2026-07-29T06:30:00Z',
  state: 'ready',
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/assets/my-project/agentprofile/123']}>
      <Routes>
        <Route
          path="/assets/:namespace/agentprofile/:profileId"
          element={<AgentProfileDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );

const renderPageWithDeployment = (deploymentName: string) =>
  render(
    <MemoryRouter
      initialEntries={[`/assets/my-project/agentprofile/123?deployment=${deploymentName}`]}
    >
      <Routes>
        <Route
          path="/assets/:namespace/agentprofile/:profileId"
          element={<AgentProfileDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe('AgentProfileDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGenAiAgentDeploymentEnabled.mockReturnValue({ enabled: true, loaded: true });
    mockUseGuardrailsEnabled.mockReturnValue(true);
    mockUseFetchAgentProfile.mockReturnValue({
      data: profile,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
    mockUseFetchAgentDeployments.mockReturnValue({
      data: [deployment],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
    mockUseFetchAgentProfiles.mockReturnValue({
      data: [
        {
          name: 'agent-profile-123',
          profileId: '123',
          displayName: 'HR Chatbot',
          namespace: 'my-project',
          lastModified: '2026-07-30T16:15:00Z',
        },
      ],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
    mockUseFetchAIModels.mockReturnValue({
      data: [
        {
          model_id: 'llama-4-scout', // eslint-disable-line camelcase
          display_name: 'Llama 4 Scout', // eslint-disable-line camelcase
        },
      ],
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    } as unknown as ReturnType<typeof useFetchAIModels>);
  });

  it('creates a shell-safe Responses API command only for HTTP endpoints', () => {
    expect(buildResponseAPICurl('javascript:alert(1)')).toBe('');
    expect(buildResponseAPICurl('not a URL')).toBe('');
    expect(buildResponseAPICurl("https://example.com/agent's-route")).toContain(
      "'https://example.com/agent'\"'\"'s-route/v1/responses'",
    );
  });

  it('does not fetch or render deployments when agent deployments are disabled', () => {
    mockUseGenAiAgentDeploymentEnabled.mockReturnValue({ enabled: false, loaded: true });
    mockUseGenAiAPI.mockReturnValue({
      api: { getAgentDeployment: jest.fn() },
      apiAvailable: true,
      refreshAllAPI: jest.fn(),
    } as unknown as ReturnType<typeof useGenAiAPI>);

    renderPage();

    expect(mockUseFetchAgentDeployments).toHaveBeenCalledWith('123', { enabled: false });
    expect(screen.queryByRole('heading', { name: /Deployments/ })).not.toBeInTheDocument();
  });

  it('shows the saved configuration and deployment summaries', () => {
    mockUseGenAiAPI.mockReturnValue({
      api: { getAgentDeployment: jest.fn() },
      apiAvailable: true,
      refreshAllAPI: jest.fn(),
    } as unknown as ReturnType<typeof useGenAiAPI>);

    renderPage();

    expect(screen.getByRole('heading', { name: 'Saved configuration' })).toBeInTheDocument();
    expect(screen.getByText('Llama 4 Scout')).toBeInTheDocument();
    expect(screen.getByText('hr-assistant')).toBeInTheDocument();
    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getByText('jira')).toBeInTheDocument();
    expect(screen.getByText('registry-tool')).toBeInTheDocument();
    expect(screen.getByText('Deployments (1)')).toBeInTheDocument();
    expect(screen.getByText(/Last modified Jul 30, 2026/)).toBeInTheDocument();
    expect(screen.getByText('Latest')).toBeInTheDocument();
    expect(screen.getByText('Jul 29')).toBeInTheDocument();
    expect(screen.getByText('hr-chatbot-a1b2')).toBeInTheDocument();
    expect(screen.getByTestId('edit-in-playground')).toHaveAccessibleName('Try in Playground');
    expect(screen.getByTestId('edit-in-playground')).toHaveAttribute(
      'href',
      '/gen-ai-studio/playground/my-project?agentProfileId=123',
    );
  });

  it('loads the deployment snapshot only when its accordion is expanded', async () => {
    let resolveDeployment: (value: AgentDeploymentSummary) => void = () => undefined;
    const deploymentDetails = new Promise<AgentDeploymentSummary>((resolve) => {
      resolveDeployment = resolve;
    });
    const getAgentDeployment = jest.fn().mockReturnValue(deploymentDetails);
    mockUseGenAiAPI.mockReturnValue({
      api: { getAgentDeployment },
      apiAvailable: true,
      refreshAllAPI: jest.fn(),
    } as unknown as ReturnType<typeof useGenAiAPI>);

    renderPage();
    expect(getAgentDeployment).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('agent-deployment-hr-chatbot-a1b2-toggle'));

    expect(screen.getByTestId('deployment-snapshot-skeleton')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('agent-deployment-hr-chatbot-a1b2-toggle'));
    fireEvent.click(screen.getByTestId('agent-deployment-hr-chatbot-a1b2-toggle'));
    expect(getAgentDeployment).toHaveBeenCalledTimes(1);

    resolveDeployment({ ...deployment, config: profile });

    await waitFor(() => {
      expect(getAgentDeployment).toHaveBeenCalledWith({ id: 'hr-chatbot-a1b2' });
    });
    expect(await screen.findByText('Deployed snapshot')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Endpoint' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Curl' })).toBeInTheDocument();
    expect(
      screen.getByText(/https:\/\/hr-chatbot\.example\.com\/v1\/responses/),
    ).toBeInTheDocument();
    expect(screen.getByText(/"input": "Hello, what can you help me with\?"/)).toBeInTheDocument();
  });

  it('expands and loads the deployment selected by the deployment query parameter', async () => {
    const getAgentDeployment = jest.fn().mockResolvedValue({ ...deployment, config: profile });
    mockUseGenAiAPI.mockReturnValue({
      api: { getAgentDeployment },
      apiAvailable: true,
      refreshAllAPI: jest.fn(),
    } as unknown as ReturnType<typeof useGenAiAPI>);
    const scrollIntoView = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    renderPageWithDeployment(deployment.name);

    await waitFor(() => {
      expect(getAgentDeployment).toHaveBeenCalledWith({ id: deployment.name });
    });
    expect(screen.getByText('Deployed snapshot')).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });
});
