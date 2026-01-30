import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponseMetrics } from '~/app/types';
import { ChatbotMessagesMetrics } from '~/app/Chatbot/ChatbotMessagesMetrics';

/* eslint-disable camelcase */
describe('ChatbotMessagesMetrics', () => {
  const mockMetrics: ResponseMetrics = {
    latency_ms: 2500,
    time_to_first_token_ms: 150,
    usage: { input_tokens: 10, output_tokens: 50, total_tokens: 60 },
  };

  it('should render collapsed by default', () => {
    render(<ChatbotMessagesMetrics metrics={mockMetrics} />);
    expect(screen.getByText('Show metrics')).toBeInTheDocument();
  });

  it('should expand and show metrics when clicked', async () => {
    render(<ChatbotMessagesMetrics metrics={mockMetrics} />);
    await userEvent.click(screen.getByText('Show metrics'));

    expect(screen.getByText('2.50 s')).toBeInTheDocument();
    expect(screen.getByText('Tokens: 60')).toBeInTheDocument();
    expect(screen.getByText('TTFT: 150ms')).toBeInTheDocument(); // Uses formatDuration
  });

  it('should not show TTFT when not provided', async () => {
    const metricsWithoutTTFT: ResponseMetrics = {
      latency_ms: 1000,
      usage: mockMetrics.usage,
    };
    render(<ChatbotMessagesMetrics metrics={metricsWithoutTTFT} />);
    await userEvent.click(screen.getByText('Show metrics'));

    expect(screen.queryByText(/TTFT/)).not.toBeInTheDocument();
  });

  it('should format latency in milliseconds when under 1 second', async () => {
    const metricsWithSmallLatency: ResponseMetrics = {
      latency_ms: 500,
      usage: mockMetrics.usage,
    };
    render(<ChatbotMessagesMetrics metrics={metricsWithSmallLatency} />);
    await userEvent.click(screen.getByText('Show metrics'));

    expect(screen.getByText('500ms')).toBeInTheDocument();
  });

  it('should not show tokens when usage is not provided', async () => {
    const metricsWithoutUsage: ResponseMetrics = {
      latency_ms: 1500,
    };
    render(<ChatbotMessagesMetrics metrics={metricsWithoutUsage} />);
    await userEvent.click(screen.getByText('Show metrics'));

    expect(screen.getByText('1.50 s')).toBeInTheDocument();
    expect(screen.queryByText(/Tokens/)).not.toBeInTheDocument();
  });

  it('should format exactly 1000ms as seconds', async () => {
    const metricsAtBoundary: ResponseMetrics = {
      latency_ms: 1000,
    };
    render(<ChatbotMessagesMetrics metrics={metricsAtBoundary} />);
    await userEvent.click(screen.getByText('Show metrics'));

    expect(screen.getByText('1.00 s')).toBeInTheDocument();
  });

  it('should format TTFT using formatDuration for values >= 1000ms', async () => {
    const metricsWithLargeTTFT: ResponseMetrics = {
      latency_ms: 500,
      time_to_first_token_ms: 1200,
    };
    render(<ChatbotMessagesMetrics metrics={metricsWithLargeTTFT} />);
    await userEvent.click(screen.getByText('Show metrics'));

    expect(screen.getByText('TTFT: 1.20 s')).toBeInTheDocument();
  });
});
