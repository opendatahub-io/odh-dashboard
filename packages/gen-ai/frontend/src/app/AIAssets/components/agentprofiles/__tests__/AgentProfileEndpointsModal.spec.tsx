import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { MemoryRouter } from 'react-router-dom';
import AgentProfileEndpointsModal from '~/app/AIAssets/components/agentprofiles/AgentProfileEndpointsModal';
import { PLAYGROUND_AGENT_EVENTS } from '~/app/tracking/playgroundAgentTrackingConstants';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

describe('AgentProfileEndpointsModal', () => {
  it('should show the most recent deployments and link to the selected deployment details', () => {
    const onClose = jest.fn();

    render(
      <MemoryRouter>
        <AgentProfileEndpointsModal
          agentName="HR Chatbot"
          namespace="my-project"
          profileId="profile-id"
          onClose={onClose}
          deployments={[
            {
              name: 'hr-chatbot-v1',
              displayName: 'HR Chatbot v1',
              namespace: 'my-project',
              agentProfileId: 'profile-id',
              routeUrl: 'https://hr-chatbot-v1.apps.example.com',
              createdAt: '2026-07-29T06:30:00Z',
              state: 'ready',
            },
            {
              name: 'hr-chatbot-v2',
              displayName: 'HR Chatbot v2',
              namespace: 'my-project',
              agentProfileId: 'profile-id',
              routeUrl: 'https://hr-chatbot-v2.apps.example.com',
              createdAt: '2026-07-30T06:30:00Z',
              state: 'ready',
            },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('HR Chatbot – Endpoint(s)')).toBeInTheDocument();
    expect(screen.getAllByText('Active')).toHaveLength(2);
    expect(screen.getByTestId('agent-endpoint-hr-chatbot-v2')).toHaveTextContent('Latest');
    expect(
      screen.getByDisplayValue('https://hr-chatbot-v2.apps.example.com/v1/responses'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('view-deployment-details-hr-chatbot-v2')).toHaveTextContent(
      'View details',
    );
    expect(screen.getByTestId('view-deployment-details-hr-chatbot-v2')).toHaveAttribute(
      'href',
      '/gen-ai-studio/assets/my-project/agentprofile/profile-id?deployment=hr-chatbot-v2',
    );
    expect(screen.queryByText('Serving name')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('view-deployment-details-hr-chatbot-v2'));
    expect(fireMiscTrackingEvent).toHaveBeenCalledWith(
      PLAYGROUND_AGENT_EVENTS.DEPLOYMENT_DETAILS_VIEWED,
      {},
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
