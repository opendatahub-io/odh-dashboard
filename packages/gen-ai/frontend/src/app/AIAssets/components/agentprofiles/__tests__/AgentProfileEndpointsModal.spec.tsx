import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AgentProfileEndpointsModal from '../AgentProfileEndpointsModal';

describe('AgentProfileEndpointsModal', () => {
  it('should show the most recent deployments and link to the selected deployment details', () => {
    render(
      <MemoryRouter>
        <AgentProfileEndpointsModal
          agentName="HR Chatbot"
          namespace="my-project"
          profileId="profile-id"
          onClose={jest.fn()}
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
  });
});
