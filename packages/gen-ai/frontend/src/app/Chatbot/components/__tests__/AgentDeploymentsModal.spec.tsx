import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import AgentDeploymentsModal from '~/app/Chatbot/components/AgentDeploymentsModal';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { PLAYGROUND_AGENT_EVENTS } from '~/app/tracking/playgroundAgentTrackingConstants';

jest.mock('~/app/hooks/useGenAiAPI');
jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));
jest.mock('~/app/AIAssets/components/agentprofiles/AgentConfigurationCard', () => ({
  __esModule: true,
  default: ({ title, deployedAt }: { title: string; deployedAt?: string }) => (
    <div>
      {title}
      {deployedAt && <span data-testid="deployment-snapshot-date">{deployedAt}</span>}
    </div>
  ),
}));
jest.mock('~/app/shared/DeleteModal', () => ({
  __esModule: true,
  default: ({
    onClose,
    onDelete,
    deleteName,
  }: {
    onClose: () => void;
    onDelete: () => void;
    deleteName: string;
  }) => (
    <div data-testid="delete-modal">
      <span>{deleteName}</span>
      <button data-testid="cancel-delete" onClick={onClose}>
        Cancel delete
      </button>
      <button data-testid="confirm-delete" onClick={onDelete}>
        Confirm delete
      </button>
    </div>
  ),
}));

const mockUseGenAiAPI = jest.mocked(useGenAiAPI);
const deploymentConfig = {
  metadata: { name: 'profile', resourceVersion: '1' },
  apiVersion: 'v1',
  kind: 'AgentProfile',
  spec: { displayName: 'HR Chatbot', model: { id: 'model', uri: 'model-uri' } },
};

describe('AgentDeploymentsModal', () => {
  const getAgentDeployment = jest.fn();
  const deleteAgentDeployment = jest.fn();
  const onClose = jest.fn();
  const onDeleted = jest.fn();
  const deployments = [
    {
      name: 'hr-chatbot',
      displayName: 'HR Chatbot',
      namespace: 'project',
      agentProfileId: 'profile',
      routeUrl: 'https://hr-chatbot.apps.example.com',
      createdAt: '2026-10-02T13:33:00Z',
      state: 'ready' as const,
    },
    {
      name: 'hr-chatbot-v2',
      displayName: 'HR Chatbot v2',
      namespace: 'project',
      agentProfileId: 'profile',
      routeUrl: 'https://hr-chatbot-v2.apps.example.com',
      createdAt: '2026-10-02T13:34:00Z',
      state: 'ready' as const,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    getAgentDeployment.mockImplementation(({ id }: { id: string }) =>
      Promise.resolve({
        ...deployments.find((deployment) => deployment.name === id),
        config: deploymentConfig,
      }),
    );
    deleteAgentDeployment.mockResolvedValue(undefined);
    mockUseGenAiAPI.mockReturnValue({
      apiAvailable: true,
      api: { getAgentDeployment, deleteAgentDeployment },
    } as unknown as ReturnType<typeof useGenAiAPI>);
  });

  it('shows deployment details in tabs', async () => {
    const user = userEvent.setup();
    render(
      <AgentDeploymentsModal
        agentName="HR Chatbot"
        deployments={deployments}
        initialDeploymentName="hr-chatbot"
        onClose={onClose}
        onDeleted={onDeleted}
      />,
    );

    expect(screen.getByText('HR Chatbot Deployments')).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'HR Chatbot v2',
      'HR Chatbot',
    ]);
    expect(screen.getByRole('tab', { name: 'HR Chatbot v2' })).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('https://hr-chatbot.apps.example.com/v1/responses'),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Configuration snapshot')).toBeInTheDocument());
    expect(screen.getByTestId('deployment-snapshot-date')).toHaveTextContent(
      '2026-10-02T13:33:00Z',
    );

    await user.click(screen.getByRole('tab', { name: 'HR Chatbot v2' }));
    expect(
      screen.getByDisplayValue('https://hr-chatbot-v2.apps.example.com/v1/responses'),
    ).toBeInTheDocument();
  });

  it('deletes the active deployment', async () => {
    const user = userEvent.setup();
    render(
      <AgentDeploymentsModal
        agentName="HR Chatbot"
        deployments={deployments}
        initialDeploymentName="hr-chatbot"
        onClose={onClose}
        onDeleted={onDeleted}
      />,
    );

    await user.click(screen.getByTestId('delete-agent-deployment-button'));
    expect(screen.getByTestId('delete-modal')).toHaveTextContent('HR Chatbot');
    await user.click(screen.getByTestId('confirm-delete'));

    await waitFor(() => expect(deleteAgentDeployment).toHaveBeenCalledWith({ id: 'hr-chatbot' }));
    expect(onDeleted).toHaveBeenCalledTimes(1);
    expect(fireMiscTrackingEvent).toHaveBeenCalledWith(
      PLAYGROUND_AGENT_EVENTS.DEPLOYMENT_DELETE_CONFIRMED,
      { outcome: 'submit' },
    );
  });

  it('tracks cancellation of deployment deletion', async () => {
    const user = userEvent.setup();
    render(
      <AgentDeploymentsModal
        agentName="HR Chatbot"
        deployments={deployments}
        initialDeploymentName="hr-chatbot"
        onClose={onClose}
        onDeleted={onDeleted}
      />,
    );

    await user.click(screen.getByTestId('delete-agent-deployment-button'));
    await user.click(screen.getByTestId('cancel-delete'));

    expect(fireMiscTrackingEvent).toHaveBeenCalledWith(
      PLAYGROUND_AGENT_EVENTS.DEPLOYMENT_DELETE_CONFIRMED,
      { outcome: 'cancel' },
    );
  });
});
