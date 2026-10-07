import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ChatbotToolCalls from '~/app/Chatbot/ChatbotToolCalls';
import { StreamingToolCall } from '~/app/types';

const toolCalls: StreamingToolCall[] = [
  {
    id: 'github-search',
    type: 'mcp_call',
    name: 'github_searchIssues',
    category: 'MCP',
    serverLabel: 'GitHub',
    status: 'completed',
    startedAt: 0,
    completedAt: 1200,
    arguments: '{"query":"label:bug state:open","repo":"org/platform"}',
    output: '{"total_count":12,"items":[{"number":451}]}',
  },
];

describe('ChatbotToolCalls', () => {
  it('should show a collapsed tool-call summary after the response completes', () => {
    render(<ChatbotToolCalls toolCalls={toolCalls} isResponseComplete />);

    expect(screen.getByRole('button', { name: '1 tool called' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByTestId('tool-call-github-search')).not.toBeVisible();
  });

  it('should display formatted arguments and results when a tool call is expanded', () => {
    render(<ChatbotToolCalls toolCalls={toolCalls} isResponseComplete={false} />);

    expect(screen.getByRole('button', { name: '1 tool called' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    fireEvent.click(screen.getByTestId('tool-call-github-search-toggle'));

    expect(screen.getByText('Arguments')).toBeInTheDocument();
    expect(screen.getByText('Results')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy arguments to clipboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy results to clipboard' })).toBeInTheDocument();
    expect(screen.getByText(/"query": "label:bug state:open"/)).toBeInTheDocument();
    expect(screen.getByText(/"total_count": 12/)).toBeInTheDocument();
  });

  it('should hide duration badges when tool calls come from a completed non-streaming response', () => {
    render(
      <ChatbotToolCalls
        isResponseComplete={false}
        toolCalls={[
          { ...toolCalls[0], startedAt: undefined, completedAt: undefined },
          {
            ...toolCalls[0],
            id: 'failed-tool',
            name: 'failed_tool',
            status: 'failed',
            startedAt: undefined,
            completedAt: undefined,
          },
        ]}
      />,
    );

    expect(screen.queryByText('0.0s')).not.toBeInTheDocument();
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
  });

  it('should show a failed streamed call duration in the danger color', () => {
    render(
      <ChatbotToolCalls
        isResponseComplete={false}
        toolCalls={[{ ...toolCalls[0], status: 'failed' }]}
      />,
    );

    expect(screen.getByText('1.2s')).toHaveClass('pf-v6-c-label__text');
    expect(screen.getByText('1.2s').closest('.pf-v6-c-label')).toHaveClass('pf-m-red');
  });

  it('should display a tool error when a failed call has no output', () => {
    render(
      <ChatbotToolCalls
        isResponseComplete={false}
        toolCalls={[
          {
            ...toolCalls[0],
            status: 'failed',
            output: undefined,
            error: 'GitHub returned 404 Not Found.',
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByTestId('tool-call-github-search-toggle'));

    expect(screen.getByText('GitHub returned 404 Not Found.')).toBeInTheDocument();
    expect(screen.queryByText('No response was received from the tool.')).not.toBeInTheDocument();
  });
});
