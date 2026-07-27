import * as React from 'react';
import { Flex, FlexItem, Label } from '@patternfly/react-core';
import { ResponseMetrics } from '~/app/types';

interface ChatbotMessagesMetricsProps {
  metrics: ResponseMetrics;
}

/**
 * Formats a duration in milliseconds to a human-readable string.
 * - Values >= 1000ms are displayed as seconds (e.g., "1.52 s")
 * - Values < 1000ms are displayed as milliseconds (e.g., "523ms")
 */
export const formatDuration = (ms: number): string => {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)} s`;
  }
  return `${ms}ms`;
};

/**
 * Calculates tokens per second from total tokens and latency.
 * Returns undefined if either value is missing or latency is zero.
 */
export const calculateTokensPerSec = (
  totalTokens: number | undefined,
  latencyMs: number,
): string | undefined => {
  if (!totalTokens || latencyMs <= 0) {
    return undefined;
  }
  const tps = totalTokens / (latencyMs / 1000);
  return tps >= 10 ? Math.round(tps).toString() : tps.toFixed(1);
};

/**
 * Formats a byte count to a human-readable string (e.g., "2.1 KB", "1.3 MB").
 */
export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Inline metrics labels displayed beneath each assistant response.
 * Shows latency, total tokens, tokens/sec, and TTFT as compact label chips.
 */
export const ChatbotMessagesMetrics: React.FC<ChatbotMessagesMetricsProps> = ({ metrics }) => {
  const tokensPerSec = calculateTokensPerSec(metrics.usage?.total_tokens, metrics.latency_ms);

  return (
    <Flex gap={{ default: 'gapSm' }} data-testid="chatbot-message-metrics">
      <FlexItem>
        <Label variant="outline" isCompact>
          {formatDuration(metrics.latency_ms)}
        </Label>
      </FlexItem>
      {metrics.usage && (
        <FlexItem>
          <Label variant="outline" isCompact>
            T: {metrics.usage.total_tokens}
          </Label>
        </FlexItem>
      )}
      {tokensPerSec && (
        <FlexItem>
          <Label variant="outline" isCompact>
            {tokensPerSec} T/s
          </Label>
        </FlexItem>
      )}
      {metrics.time_to_first_token_ms !== undefined && (
        <FlexItem>
          <Label variant="outline" isCompact>
            TTFT: {formatDuration(metrics.time_to_first_token_ms)}
          </Label>
        </FlexItem>
      )}
      {metrics.response_size_bytes !== undefined && metrics.response_size_bytes > 0 && (
        <FlexItem>
          <Label variant="outline" isCompact>
            {formatBytes(metrics.response_size_bytes)}
          </Label>
        </FlexItem>
      )}
    </Flex>
  );
};
