import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { ResponseMetrics } from '~/app/types';
import {
  ChatbotMessagesMetrics,
  formatDuration,
  calculateTokensPerSec,
  formatBytes,
} from '~/app/Chatbot/ChatbotMessagesMetrics';

describe('formatDuration', () => {
  it('formats milliseconds below 1000 as ms', () => {
    expect(formatDuration(0)).toBe('0ms');
    expect(formatDuration(1)).toBe('1ms');
    expect(formatDuration(523)).toBe('523ms');
    expect(formatDuration(999)).toBe('999ms');
  });

  it('formats 1000ms and above as seconds', () => {
    expect(formatDuration(1000)).toBe('1.00 s');
    expect(formatDuration(1520)).toBe('1.52 s');
    expect(formatDuration(27550)).toBe('27.55 s');
    expect(formatDuration(60000)).toBe('60.00 s');
  });

  it('handles large values', () => {
    expect(formatDuration(120500)).toBe('120.50 s');
  });
});

describe('calculateTokensPerSec', () => {
  it('calculates tokens per second', () => {
    expect(calculateTokensPerSec(100, 2000)).toBe('50');
    expect(calculateTokensPerSec(159, 27550)).toBe('5.8');
  });

  it('rounds to integer when >= 10', () => {
    expect(calculateTokensPerSec(200, 1000)).toBe('200');
    expect(calculateTokensPerSec(50, 1000)).toBe('50');
  });

  it('shows one decimal when < 10', () => {
    expect(calculateTokensPerSec(5, 1000)).toBe('5.0');
    expect(calculateTokensPerSec(15, 2000)).toBe('7.5');
  });

  it('returns undefined for zero latency', () => {
    expect(calculateTokensPerSec(100, 0)).toBeUndefined();
  });

  it('returns undefined for negative latency', () => {
    expect(calculateTokensPerSec(100, -1)).toBeUndefined();
  });

  it('returns undefined for zero tokens', () => {
    expect(calculateTokensPerSec(0, 1000)).toBeUndefined();
  });

  it('returns undefined for undefined tokens', () => {
    expect(calculateTokensPerSec(undefined, 1000)).toBeUndefined();
  });
});

describe('formatBytes', () => {
  it('formats bytes below 1024 as B', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(2150)).toBe('2.1 KB');
    expect(formatBytes(10240)).toBe('10.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(1.3 * 1024 * 1024)).toBe('1.3 MB');
  });
});

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
