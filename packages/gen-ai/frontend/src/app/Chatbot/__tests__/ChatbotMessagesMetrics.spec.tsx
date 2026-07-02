import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { ResponseMetrics } from '~/app/types';
import { ChatbotMessagesMetrics } from '~/app/Chatbot/ChatbotMessagesMetrics';

/* eslint-disable camelcase */
describe('ChatbotMessagesMetrics', () => {
  const mockMetrics: ResponseMetrics = {
    latency_ms: 2500,
    time_to_first_token_ms: 150,
    usage: { input_tokens: 10, output_tokens: 50, total_tokens: 60 },
  };

  it('should render metrics inline (always visible)', () => {
    render(<ChatbotMessagesMetrics metrics={mockMetrics} />);
    expect(screen.getByText('2.50 s')).toBeInTheDocument();
    expect(screen.getByText('T: 60')).toBeInTheDocument();
  });

  it('should show all metrics labels', () => {
    const { container } = render(<ChatbotMessagesMetrics metrics={mockMetrics} />);

    expect(screen.getByText('2.50 s')).toBeInTheDocument();
    expect(screen.getByText('T: 60')).toBeInTheDocument();
    expect(container.textContent).toContain('T/s');
    expect(container.textContent).toContain('TTFT:');
    expect(container.textContent).toContain('150ms');
  });

  it('should not show TTFT when not provided', () => {
    const metricsWithoutTTFT: ResponseMetrics = {
      latency_ms: 1000,
      usage: mockMetrics.usage,
    };
    render(<ChatbotMessagesMetrics metrics={metricsWithoutTTFT} />);

    expect(screen.queryByText(/TTFT/)).not.toBeInTheDocument();
  });

  it('should format latency in milliseconds when under 1 second', () => {
    const metricsWithSmallLatency: ResponseMetrics = {
      latency_ms: 500,
      usage: mockMetrics.usage,
    };
    render(<ChatbotMessagesMetrics metrics={metricsWithSmallLatency} />);

    expect(screen.getByText('500ms')).toBeInTheDocument();
  });

  it('should not show tokens when usage is not provided', () => {
    const metricsWithoutUsage: ResponseMetrics = {
      latency_ms: 1500,
    };
    render(<ChatbotMessagesMetrics metrics={metricsWithoutUsage} />);

    expect(screen.getByText('1.50 s')).toBeInTheDocument();
    expect(screen.queryByText(/T:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/T\/s/)).not.toBeInTheDocument();
  });

  it('should format exactly 1000ms as seconds', () => {
    const metricsAtBoundary: ResponseMetrics = {
      latency_ms: 1000,
    };
    render(<ChatbotMessagesMetrics metrics={metricsAtBoundary} />);

    expect(screen.getByText('1.00 s')).toBeInTheDocument();
  });

  it('should show response size when provided', () => {
    const metricsWithSize: ResponseMetrics = {
      latency_ms: 1000,
      response_size_bytes: 2150,
    };
    render(<ChatbotMessagesMetrics metrics={metricsWithSize} />);

    expect(screen.getByText('2.1 KB')).toBeInTheDocument();
  });

  it('should not show response size when zero', () => {
    const metricsWithZeroSize: ResponseMetrics = {
      latency_ms: 1000,
      response_size_bytes: 0,
    };
    render(<ChatbotMessagesMetrics metrics={metricsWithZeroSize} />);

    expect(screen.queryByText(/KB|MB|B$/)).not.toBeInTheDocument();
  });
});
