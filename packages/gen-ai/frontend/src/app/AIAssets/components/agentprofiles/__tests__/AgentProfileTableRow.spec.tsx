import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AgentProfileSummary } from '~/app/agentProfile/types';
import AgentProfileTableRow from '../AgentProfileTableRow';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('../DeleteAgentProfileModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../EditAgentProfileModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../AgentProfileEndpointsModal', () => ({
  __esModule: true,
  default: () => null,
}));

const profile: AgentProfileSummary = {
  name: 'hr-chatbot',
  profileId: 'profile-id',
  displayName: 'HR Chatbot',
  namespace: 'my-project',
  lastModified: '2026-07-30T06:30:00Z',
};

describe('AgentProfileTableRow', () => {
  it('should link the agent name to the configuration details page', () => {
    render(
      <MemoryRouter initialEntries={['/gen-ai-studio/assets/my-project/agentprofile']}>
        <Routes>
          <Route
            path="/gen-ai-studio/assets/:namespace/*"
            element={
              <table>
                <tbody>
                  <AgentProfileTableRow
                    profile={profile}
                    deployments={[]}
                    deploymentsLoading={false}
                    showEndpointsColumn
                    onDelete={jest.fn()}
                    onRefresh={jest.fn()}
                  />
                </tbody>
              </table>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('agent-profile-link-profile-id')).toHaveAttribute(
      'href',
      '/gen-ai-studio/assets/my-project/agentprofile/profile-id',
    );
  });
});
