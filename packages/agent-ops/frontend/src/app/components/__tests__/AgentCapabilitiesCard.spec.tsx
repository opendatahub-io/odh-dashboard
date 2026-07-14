import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import AgentCapabilitiesCard from '~/app/components/AgentCapabilitiesCard';
import { mockAgentCardDetail } from '~/__mocks__/mockAgentRuntime';

jest.mock('@odh-dashboard/internal/components/markdown/MarkdownComponent', () => ({
  __esModule: true,
  default: ({ data, dataTestId }: { data: string; dataTestId?: string }) => (
    <div data-testid={dataTestId}>{data}</div>
  ),
}));

describe('AgentCapabilitiesCard', () => {
  it('renders skills from agent card data', () => {
    render(<AgentCapabilitiesCard agentCard={mockAgentCardDetail()} />);

    expect(screen.getByTestId('agent-capabilities-skills')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByTestId('agent-skill-card-code-generation')).toBeInTheDocument();
    expect(screen.getByTestId('agent-skill-card-code-generation')).toHaveTextContent(
      'ID: code-generation',
    );
    expect(screen.getByTestId('agent-skill-description-code-generation')).toBeInTheDocument();
    expect(screen.getByText('Add unit tests for the auth module')).toBeInTheDocument();
  });

  it('renders nothing when no skills are available', () => {
    const { container } = render(
      <AgentCapabilitiesCard agentCard={mockAgentCardDetail({ skills: [] })} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('hides input and output modes when skill modes are empty', () => {
    const [skill] = mockAgentCardDetail().skills ?? [];
    render(
      <AgentCapabilitiesCard
        agentCard={mockAgentCardDetail({
          skills: [{ ...skill, inputModes: [], outputModes: [] }],
        })}
      />,
    );

    expect(screen.queryByTestId('agent-skill-modes')).not.toBeInTheDocument();
  });

  it('renders skill metadata including tags and modes', () => {
    const [skill] = mockAgentCardDetail().skills ?? [];
    render(
      <AgentCapabilitiesCard
        agentCard={mockAgentCardDetail({
          skills: [{ ...skill, inputModes: ['text/plain'], outputModes: ['text/plain'] }],
        })}
      />,
    );

    expect(screen.getByTestId('agent-skill-tags')).toHaveTextContent('development');
    expect(screen.getByTestId('agent-skill-modes')).toHaveTextContent(
      'Input: text/plain · Output: text/plain',
    );
  });
});
